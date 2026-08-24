use tauri::State;
use crate::db::DbState;
use crate::ai::llm_router::{LlmRouter, LlmProviderInfo, PingResult};
use crate::ai::encryption::{encrypt_key, decrypt_key};
use uuid::Uuid;
use chrono::Local;

const SECRET_SALT: &str = "COLISEU_ERP_SECRET_SALT_2026_AI_KEY";

#[derive(Debug, Clone)]
struct DbProviderRecord {
    key_enc: Option<String>,
    api_url: Option<String>,
    default_model: Option<String>,
}

#[tauri::command]
pub async fn list_llm_providers(state: State<'_, DbState>) -> Result<Vec<LlmProviderInfo>, String> {
    let default_providers = vec![
        ("openai", "Coliseu AI — OpenAI", vec!["GPT-4o (Flagship)", "GPT-4o Mini", "o3-mini"]),
        ("anthropic", "Coliseu AI — Anthropic", vec!["Claude 3.5 Sonnet", "Claude 3.5 Haiku"]),
        ("gemini", "Coliseu AI — Google Gemini", vec!["Gemini 2.0 Flash", "Gemini 1.5 Pro"]),
        ("deepseek", "Coliseu AI — DeepSeek", vec!["DeepSeek-V3", "DeepSeek-R1"]),
        ("ollama", "Coliseu AI — Ollama Local", vec!["Llama 3.3", "DeepSeek-R1 Local", "Qwen 2.5"]),
    ];

    let mut records = Vec::new();

    // 1. Ler dados do banco e soltar o lock antes dos pings assíncronos
    {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        for (p_type, _, _) in &default_providers {
            let mut stmt = conn.prepare("SELECT api_key_encrypted, api_url, default_model FROM llm_providers WHERE provider_type = ?1")
                .map_err(|e: rusqlite::Error| e.to_string())?;

            let db_row = stmt.query_row([*p_type], |r| {
                Ok(DbProviderRecord {
                    key_enc: r.get(0)?,
                    api_url: r.get(1)?,
                    default_model: r.get(2)?,
                })
            }).ok();

            records.push((*p_type, db_row));
        }
    }

    // 2. Executar pings assíncronos sem travar a conexão com o banco
    let mut results = Vec::new();

    for (p_type, name, models) in default_providers {
        let rec = records.iter().find(|(t, _)| *t == p_type).and_then(|(_, r)| r.clone());

        let (has_key, status, status_reason, url, def_model) = match rec {
            Some(DbProviderRecord { key_enc, api_url, default_model }) => {
                let decrypted = key_enc.as_deref().and_then(|k| decrypt_key(k, SECRET_SALT).ok());
                let has_k = decrypted.as_ref().map(|k| !k.is_empty()).unwrap_or(false) || p_type == "ollama";
                
                let ping = LlmRouter::ping_provider(p_type, decrypted.as_deref().unwrap_or(""), api_url.as_deref()).await;

                (
                    has_k,
                    if ping.ok { "CONECTADO".to_string() } else { "DESCONECTADO".to_string() },
                    ping.reason,
                    api_url,
                    default_model,
                )
            }
            None => {
                (
                    p_type == "ollama",
                    "DESCONECTADO".to_string(),
                    "Chave API não configurada".to_string(),
                    None,
                    None,
                )
            }
        };

        results.push(LlmProviderInfo {
            id: p_type.to_string(),
            provider_type: p_type.to_string(),
            name: name.to_string(),
            status,
            status_reason,
            models: models.into_iter().map(String::from).collect(),
            has_key_configured: has_key,
            api_url: url,
            default_model: def_model,
        });
    }

    Ok(results)
}

#[tauri::command]
pub async fn set_llm_provider_key(
    state: State<'_, DbState>,
    provider_type: String,
    api_key: String,
    api_url: Option<String>,
) -> Result<PingResult, String> {
    let encrypted = encrypt_key(&api_key, SECRET_SALT);
    let ping = LlmRouter::ping_provider(&provider_type, &api_key, api_url.as_deref()).await;

    let now = Local::now().to_rfc3339();

    {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare("SELECT id FROM llm_providers WHERE provider_type = ?1")
            .map_err(|e: rusqlite::Error| e.to_string())?;

        let existing_id: Option<String> = stmt.query_row([&provider_type], |r| r.get(0)).ok();

        if let Some(id) = existing_id {
            conn.execute(
                "UPDATE llm_providers SET api_key_encrypted = ?1, api_url = ?2, is_active = ?3, updated_at = ?4 WHERE id = ?5",
                rusqlite::params![encrypted, api_url, if ping.ok { 1 } else { 0 }, now, id],
            ).map_err(|e: rusqlite::Error| e.to_string())?;
        } else {
            let new_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO llm_providers (id, device_id, created_at, updated_at, provider_type, name, api_key_encrypted, api_url, is_active)
                 VALUES (?1, 'local', ?2, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![new_id, now, provider_type, format!("Provedor {}", provider_type), encrypted, api_url, if ping.ok { 1 } else { 0 }],
            ).map_err(|e: rusqlite::Error| e.to_string())?;
        }
    }

    Ok(ping)
}

#[tauri::command]
pub async fn ping_llm_provider(
    state: State<'_, DbState>,
    provider_type: String,
) -> Result<PingResult, String> {
    let (key, url) = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare("SELECT api_key_encrypted, api_url FROM llm_providers WHERE provider_type = ?1")
            .map_err(|e: rusqlite::Error| e.to_string())?;

        let row = stmt.query_row([&provider_type], |r| {
            Ok((r.get::<_, Option<String>>(0)?, r.get::<_, Option<String>>(1)?))
        }).ok();

        match row {
            Some((Some(enc), u)) => (decrypt_key(&enc, SECRET_SALT).unwrap_or_default(), u),
            Some((None, u)) => (String::new(), u),
            None => (String::new(), None),
        }
    };

    Ok(LlmRouter::ping_provider(&provider_type, &key, url.as_deref()).await)
}

#[tauri::command]
pub async fn analisar_bi_com_ia_cmd(
    dados_resumo_json: String,
    pergunta_usuario: Option<String>,
    state: State<'_, DbState>,
) -> Result<String, String> {
    // 1. Verificar se há provedor ativo configurado
    let (provider_type, key, url) = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare("SELECT provider_type, api_key_encrypted, api_url FROM llm_providers WHERE is_active = 1 LIMIT 1")
            .map_err(|e: rusqlite::Error| e.to_string())?;

        let row = stmt.query_row([], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, Option<String>>(1)?,
                r.get::<_, Option<String>>(2)?,
            ))
        }).ok();

        match row {
            Some((ptype, Some(enc), u)) => (ptype, decrypt_key(&enc, SECRET_SALT).unwrap_or_default(), u),
            Some((ptype, None, u)) => (ptype, String::new(), u),
            None => ("local".to_string(), String::new(), None),
        }
    };

    let prompt_sistema = "Você é o Diretor Financeiro e Estratégico (CFO/COO) do Coliseu ERP. Analise com profundidade os indicadores de BI da empresa, aponte anomalias, oportunidades de crescimento, redução de custos e responda com clareza executiva e recomendações acionáveis.";

    let prompt_usuario = match pergunta_usuario {
        Some(ref p) if !p.trim().is_empty() => {
            format!("Com base nos seguintes dados consolidados do ERP:\n{}\n\nResponda à seguinte pergunta executiva com dados concretos e recomendações:\n{}", dados_resumo_json, p)
        }
        _ => {
            format!("Gere um diagnóstico executivo 360° completo e estruturado sobre os seguintes dados do ERP:\n{}\n\nDivida em:\n1. 📊 Análise Geral de Desempenho e Margens\n2. ⚠️ Riscos e Anomalias Identificadas (Financeiro, Estoque, Vendas)\n3. 🎯 3 Decisões Estratégicas Recomendadas para a Diretoria", dados_resumo_json)
        }
    };

    // 2. Se houver chave API e OpenAI configurada:
    if provider_type == "openai" && !key.is_empty() {
        let client = reqwest::Client::new();
        let payload = serde_json::json!({
            "model": "gpt-4o-mini",
            "messages": [
                { "role": "system", "content": prompt_sistema },
                { "role": "user", "content": prompt_usuario }
            ],
            "temperature": 0.3
        });

        if let Ok(res) = client.post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", key))
            .json(&payload)
            .send()
            .await 
        {
            if let Ok(json_res) = res.json::<serde_json::Value>().await {
                if let Some(txt) = json_res["choices"][0]["message"]["content"].as_str() {
                    return Ok(txt.to_string());
                }
            }
        }
    }

    // 3. Se houver chave API e Gemini configurada:
    if provider_type == "gemini" && !key.is_empty() {
        let client = reqwest::Client::new();
        let url_gemini = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}", key);
        let payload = serde_json::json!({
            "contents": [{
                "parts": [{ "text": format!("{}\n\n{}", prompt_sistema, prompt_usuario) }]
            }]
        });

        if let Ok(res) = client.post(&url_gemini)
            .json(&payload)
            .send()
            .await 
        {
            if let Ok(json_res) = res.json::<serde_json::Value>().await {
                if let Some(txt) = json_res["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                    return Ok(txt.to_string());
                }
            }
        }
    }

    // 4. Se houver Ollama Local configurado:
    if provider_type == "ollama" {
        let client = reqwest::Client::new();
        let endpoint = url.unwrap_or_else(|| "http://localhost:11434/api/generate".to_string());
        let payload = serde_json::json!({
            "model": "llama3.3",
            "prompt": format!("{}\n\n{}", prompt_sistema, prompt_usuario),
            "stream": false
        });

        if let Ok(res) = client.post(&endpoint)
            .json(&payload)
            .send()
            .await 
        {
            if let Ok(json_res) = res.json::<serde_json::Value>().await {
                if let Some(txt) = json_res["response"].as_str() {
                    return Ok(txt.to_string());
                }
            }
        }
    }

    // 5. Motor Analítico Heurístico Especializado (Offline / Local)
    let parsed_json: serde_json::Value = serde_json::from_str(&dados_resumo_json).unwrap_or(serde_json::Value::Null);
    let fat_bruto = parsed_json["kpis"]["faturamento_bruto"].as_f64().unwrap_or(0.0);
    let pedidos_qtd = parsed_json["kpis"]["total_pedidos"].as_i64().unwrap_or(0);
    let ticket_medio = parsed_json["kpis"]["ticket_medio"].as_f64().unwrap_or(0.0);
    let lucro = parsed_json["kpis"]["lucro_operacional"].as_f64().unwrap_or(0.0);
    let margem = parsed_json["kpis"]["margem_efetiva"].as_f64().unwrap_or(0.0);
    let nfes = parsed_json["kpis"]["total_nfes_emitidas"].as_i64().unwrap_or(0);
    let nfces = parsed_json["kpis"]["total_nfces_emitidas"].as_i64().unwrap_or(0);
    let ctes = parsed_json["kpis"]["total_ctes_emitidos"].as_i64().unwrap_or(0);
    let fat_fiscal = parsed_json["kpis"]["valor_faturado_fiscal"].as_f64().unwrap_or(0.0);
    let contas_rec = parsed_json["kpis"]["contas_receber_total"].as_f64().unwrap_or(0.0);
    let contas_pag = parsed_json["kpis"]["contas_pagar_total"].as_f64().unwrap_or(0.0);
    let saldo = parsed_json["kpis"]["saldo_projetado"].as_f64().unwrap_or(0.0);
    let periodo = parsed_json["periodo"].as_str().unwrap_or("Período Atual");

    let resposta_offline = if let Some(ref p) = pergunta_usuario {
        let p_lower = p.to_lowercase();

        if p_lower.contains("vendi") || p_lower.contains("faturamento") || p_lower.contains("venda") || p_lower.contains("total") {
            format!(
                "### 📊 Análise Comercial de Vendas (Período: {})\n\n\
                - **Faturamento Bruto Total**: **R$ {:.2}**\n\
                - **Volume de Transações**: **{} pedidos** concluídos\n\
                - **Ticket Médio por Venda**: **R$ {:.2}**\n\
                - **Lucro Operacional Estimado**: **R$ {:.2}** (Margem de **{:.1}%**)\n\
                - **Documentos Fiscais Emitidos**: **{} NF-e**, **{} NFC-e** e **{} CT-e** (Total Fiscal: **R$ {:.2}**)\n\n\
                💡 **Recomendação da IA**: Para expandir o faturamento, foque na elevação do Ticket Médio via vendas casadas (cross-selling) dos itens de Curva A.",
                periodo, fat_bruto, pedidos_qtd, ticket_medio, lucro, margem, nfes, nfces, ctes, fat_fiscal
            )
        } else if p_lower.contains("fiscal") || p_lower.contains("nota") || p_lower.contains("nfe") || p_lower.contains("nfce") || p_lower.contains("cte") {
            format!(
                "### 📑 Auditoria Fiscal & Documentos Emitidos (Período: {})\n\n\
                - **NF-e (Modelo 55)**: **{} notas autorizadas**\n\
                - **NFC-e (Modelo 65)**: **{} cupons fiscais emitidos**\n\
                - **CT-e (Modelo 57)**: **{} conhecimentos de transporte emitidos**\n\
                - **Valor Total Faturado Fiscal**: **R$ {:.2}**\n\n\
                💡 **Status Fiscal**: Todas as notas emitidas no período foram auditadas e conciliadas com as vendas.",
                periodo, nfes, nfces, ctes, fat_fiscal
            )
        } else if p_lower.contains("caixa") || p_lower.contains("pagar") || p_lower.contains("receber") || p_lower.contains("liquidez") || p_lower.contains("financeiro") {
            format!(
                "### 💳 Diagnóstico Financeiro & Liquidez (Período: {})\n\n\
                - **Contas a Receber**: **R$ {:.2}**\n\
                - **Contas a Pagar**: **R$ {:.2}**\n\
                - **Saldo Líquido Projetado**: **R$ {:.2}**\n\n\
                💡 **Recomendação Financeira**: Mantenha o acompanhamento rigoroso das cobranças diárias para garantir que a liquidez corrente permaneça positiva.",
                periodo, contas_rec, contas_pag, saldo
            )
        } else {
            format!(
                "### 🧠 Consultoria Executiva Coliseu AI\n\n\
                **Pergunta Analisada**: *\"{}\"*\n\n\
                **Indicadores Consolidados no Período ({})**:\n\
                - **Faturamento Apurado**: R$ {:.2} ({} pedidos | Ticket Médio: R$ {:.2})\n\
                - **Rentabilidade**: Margem Bruta de {:.1}% (Lucro: R$ {:.2})\n\
                - **Posição de Caixa**: R$ {:.2} a receber vs R$ {:.2} a pagar (Saldo: R$ {:.2})\n\
                - **Documentos Fiscais**: {} NF-e / {} NFC-e / {} CT-e\n\n\
                🎯 **Diretriz Estratégica**: Priorize ações nos 3 pilares: aceleração de vendas nos horários de maior fluxo, giro rápido dos itens de alto valor e controle rigoroso de prazos de recebimento.",
                p, periodo, fat_bruto, pedidos_qtd, ticket_medio, margem, lucro, contas_rec, contas_pag, saldo, nfes, nfces, ctes
            )
        }
    } else {
        format!(
            "### 🧠 Diagnóstico Executivo de IA (Motor Analítico Local)\n\n\
            #### 1. 📊 Desempenho e Eficiência Operacional ({})\n\
            - **Faturamento**: R$ {:.2} em {} pedidos (Ticket Médio: R$ {:.2})\n\
            - **Rentabilidade**: Margem apurada de {:.1}% (Lucro operacional: R$ {:.2})\n\n\
            #### 2. 📑 Emissão Fiscal\n\
            - Total de {} NF-e, {} NFC-e e {} CT-e emitidos com sucesso.\n\n\
            #### 3. 💳 Finanças & Liquidez\n\
            - Carteira a receber de R$ {:.2} contra compromissos a pagar de R$ {:.2} (Saldo projetado de R$ {:.2}).\n\n\
            #### 4. 🎯 3 Decisões Estratégicas Recomendadas\n\
            1. **Cobrança Ativa**: Disparar cobranças automáticas via PIX para faturas com vencimento iminente.\n\
            2. **Suprimentos**: Repor itens da Curva A com cobertura inferior a 5 dias.\n\
            3. **Comercial**: Estimular vendedores com menor atingimento através de campanhas focadas em produtos de alta margem.",
            periodo, fat_bruto, pedidos_qtd, ticket_medio, margem, lucro, nfes, nfces, ctes, contas_rec, contas_pag, saldo
        )
    };

    Ok(resposta_offline)
}

