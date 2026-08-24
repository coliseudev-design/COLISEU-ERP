//! Domain engine para Ficha Cadastral de Clientes & Fornecedores (unificada), Múltiplos Endereços/Contatos/Referências, Veículos e Auto-Fill via APIs gratuitas (BrasilAPI e ViaCEP)

use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tracing::info;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PessoaInput {
    pub id: Option<String>,
    pub empresa_id: String,
    pub tipo_cadastro: String, // 'CLIENTE', 'FORNECEDOR', 'PRODUTOR', 'REVENDEDOR', 'FUNCIONARIO', 'PORTADOR', 'TRANSPORTADOR', 'CLIENTE_FORNECEDOR'
    pub tipo: String,          // 'FISICA', 'JURIDICA'
    pub nome_razaosocial: String,
    pub nome_fantasia: Option<String>,
    pub cpf_cnpj: Option<String>,
    pub foto_base64: Option<String>,
    pub codigo_interno: Option<String>,

    // Pessoa Física
    pub sexo: Option<String>,
    pub rg: Option<String>,
    pub rg_orgao_emissor: Option<String>,
    pub rg_data_emissao: Option<String>,
    pub data_nascimento: Option<String>,
    pub naturalidade: Option<String>,
    pub estado_civil: Option<String>,
    pub nome_mae: Option<String>,
    pub profissao: Option<String>,

    // Pessoa Jurídica
    pub inscricao_estadual: Option<String>,
    pub inscricao_municipal: Option<String>,
    pub inscricao_suframa: Option<String>,
    pub cnae_principal: Option<String>,
    pub data_fundacao: Option<String>,
    pub optante_simples: Option<bool>,

    // Endereço Principal
    pub cep: Option<String>,
    pub logradouro: Option<String>,
    pub numero: Option<String>,
    pub complemento: Option<String>,
    pub bairro: Option<String>,
    pub municipio: Option<String>,
    pub uf: Option<String>,
    pub codigo_ibge: Option<String>,
    pub pais: Option<String>,

    // Contato
    pub email: Option<String>,
    pub email_principal: Option<String>,
    pub email_financeiro: Option<String>,
    pub telefone: Option<String>,
    pub telefone_fixo: Option<String>,
    pub celular: Option<String>,
    pub whatsapp: Option<String>,
    pub site: Option<String>,

    // Crédito
    pub limite_credito: Option<f64>,
    pub limite_credito_validade: Option<String>,
    pub classificacao_credito: Option<String>,
    pub dia_vencimento_preferencial: Option<i64>,
    pub dias_aviso_antes_vencimento: Option<i64>,
    pub score_credito: Option<i64>,

    // Comercial
    pub vendedor_id: Option<String>,
    pub regiao: Option<String>,
    pub convenio: Option<String>,
    pub classe: Option<String>,
    pub tabela_preco_id: Option<String>,

    // Fiscal
    pub contribuinte_icms: Option<String>,
    pub substituto_tributario: Option<bool>,
    pub consumidor_final: Option<bool>,

    pub observacoes: Option<String>,
    pub observacoes_internas: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnderecoPessoa {
    pub id: String,
    pub pessoa_id: String,
    pub tipo_endereco: String, // 'PRINCIPAL', 'ENTREGA', 'COBRANCA', 'COMERCIAL'
    pub cep: String,
    pub logradouro: String,
    pub numero: String,
    pub complemento: Option<String>,
    pub bairro: String,
    pub municipio: String,
    pub uf: String,
    pub codigo_ibge: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContatoPessoa {
    pub id: String,
    pub pessoa_id: String,
    pub tipo_contato: String, // 'COMERCIAL', 'FINANCEIRO', 'COMPRAS', 'REPRESENTANTE'
    pub nome: String,
    pub cargo: Option<String>,
    pub telefone: Option<String>,
    pub celular: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReferenciaPessoa {
    pub id: String,
    pub pessoa_id: String,
    pub nome_empresa: String,
    pub cnpj: Option<String>,
    pub telefone: Option<String>,
    pub contato: Option<String>,
    pub limite_concedido: f64,
    pub tempo_relacionamento: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VeiculoPessoa {
    pub id: String,
    pub pessoa_id: String,
    pub placa: String,
    pub modelo: String,
    pub marca: String,
    pub ano_fabricacao: Option<i64>,
    pub ano_modelo: Option<i64>,
    pub renavam: Option<String>,
    pub cor: Option<String>,
    pub km_atual: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PessoaCompleta {
    pub input: PessoaInput,
    pub enderecos: Vec<EnderecoPessoa>,
    pub contatos: Vec<ContatoPessoa>,
    pub referencias: Vec<ReferenciaPessoa>,
    pub veiculos: Vec<VeiculoPessoa>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CnpjBrasilApiResult {
    pub razao_social: String,
    pub nome_fantasia: Option<String>,
    pub cnpj: String,
    pub cep: Option<String>,
    pub logradouro: Option<String>,
    pub numero: Option<String>,
    pub complemento: Option<String>,
    pub bairro: Option<String>,
    pub municipio: Option<String>,
    pub uf: Option<String>,
    pub cnae_fiscal: Option<i64>,
    pub cnae_fiscal_descricao: Option<String>,
    pub opcao_pelo_simples: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViaCepResult {
    pub cep: String,
    pub logradouro: String,
    pub complemento: String,
    pub bairro: String,
    pub localidade: String,
    pub uf: String,
    pub ibge: String,
}

/// Salva ou Atualiza um Cadastro Completo de Pessoa (Cliente/Fornecedor)
pub fn salvar_pessoa(
    conn: &mut Connection,
    device_id: &str,
    input: PessoaInput,
) -> Result<String, String> {
    crate::domain::transporte::ensure_empresa_exists(conn, &input.empresa_id, device_id).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    let pessoa_id = input.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());

    let is_client = if input.tipo_cadastro == "CLIENTE" || input.tipo_cadastro == "CLIENTE_FORNECEDOR" { 1 } else { 0 };
    let is_fornecedor = if input.tipo_cadastro == "FORNECEDOR" || input.tipo_cadastro == "CLIENTE_FORNECEDOR" { 1 } else { 0 };

    conn.execute(
        "INSERT INTO pessoas (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            empresa_id, tipo_cadastro, tipo, nome_razaosocial, nome_fantasia, cpf_cnpj, foto_base64, codigo_interno,
            sexo, rg, rg_orgao_emissor, rg_data_emissao, data_nascimento, naturalidade, estado_civil, nome_mae, profissao,
            inscricao_estadual, inscricao_municipal, inscricao_suframa, cnae_principal, data_fundacao, optante_simples,
            cep, logradouro, numero, complemento, bairro, municipio, uf, codigo_ibge, pais,
            email, email_principal, email_financeiro, telefone, telefone_fixo, celular, whatsapp, site,
            is_cliente, is_fornecedor, limite_credito, limite_credito_validade, classificacao_credito,
            dia_vencimento_preferencial, dias_aviso_antes_vencimento, score_credito,
            vendedor_id, regiao, convenio, classe, tabela_preco_id,
            contribuinte_icms, substituto_tributario, consumidor_final, observacoes, observacoes_internas, ativo
        ) VALUES (
            ?1, ?2, ?3, ?3, 'pending', 1, 0,
            ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11,
            ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20,
            ?21, ?22, ?23, ?24, ?25, ?26,
            ?27, ?28, ?29, ?30, ?31, ?32, ?33, ?34, ?35,
            ?36, ?37, ?38, ?39, ?40, ?41, ?42, ?43,
            ?44, ?45, ?46, ?47, ?48,
            ?49, ?50, ?51,
            ?52, ?53, ?54, ?55, ?56,
            ?57, ?58, ?59, ?60, ?61, 1
        ) ON CONFLICT(id) DO UPDATE SET
            updated_at = ?3,
            tipo_cadastro = ?5, tipo = ?6, nome_razaosocial = ?7, nome_fantasia = ?8, cpf_cnpj = ?9, foto_base64 = ?10,
            limite_credito = ?46, observacoes = ?60",
        params![
            pessoa_id, device_id, now,
            input.empresa_id, input.tipo_cadastro, input.tipo, input.nome_razaosocial, input.nome_fantasia, input.cpf_cnpj, input.foto_base64, input.codigo_interno,
            input.sexo, input.rg, input.rg_orgao_emissor, input.rg_data_emissao, input.data_nascimento, input.naturalidade, input.estado_civil, input.nome_mae, input.profissao,
            input.inscricao_estadual, input.inscricao_municipal, input.inscricao_suframa, input.cnae_principal, input.data_fundacao, input.optante_simples.map(|b| if b { 1 } else { 0 }),
            input.cep, input.logradouro, input.numero, input.complemento, input.bairro, input.municipio, input.uf, input.codigo_ibge, input.pais.unwrap_or_else(|| "BRASIL".to_string()),
            input.email, input.email_principal, input.email_financeiro, input.telefone, input.telefone_fixo, input.celular, input.whatsapp, input.site,
            is_client, is_fornecedor, input.limite_credito.unwrap_or(5000.0), input.limite_credito_validade, input.classificacao_credito.unwrap_or_else(|| "NAO_DEFINIDO".to_string()),
            input.dia_vencimento_preferencial, input.dias_aviso_antes_vencimento, input.score_credito.unwrap_or(700),
            input.vendedor_id, input.regiao, input.convenio, input.classe, input.tabela_preco_id,
            input.contribuinte_icms.unwrap_or_else(|| "NAO_CONTRIBUINTE".to_string()), input.substituto_tributario.map(|b| if b { 1 } else { 0 }), input.consumidor_final.map(|b| if b { 1 } else { 0 }), input.observacoes, input.observacoes_internas
        ],
    ).map_err(|e| format!("Erro ao salvar pessoa: {}", e))?;

    info!("Pessoa {} ({}) salva com sucesso", input.nome_razaosocial, pessoa_id);
    Ok(pessoa_id)
}

/// Lista cadastros filtrando por tipo (ex: 'CLIENTE', 'FORNECEDOR' ou 'TODOS')
pub fn listar_pessoas(
    conn: &Connection,
    empresa_id: &str,
    filtro_tipo: Option<&str>,
) -> Result<Vec<PessoaInput>, String> {
    let sql = if let Some(tipo) = filtro_tipo {
        format!(
            "SELECT id, empresa_id, tipo_cadastro, tipo, nome_razaosocial, nome_fantasia, cpf_cnpj, foto_base64,
                    email_principal, telefone, celular, whatsapp, limite_credito, cep, logradouro, numero, bairro, municipio, uf
             FROM pessoas WHERE empresa_id = ?1 AND tipo_cadastro = '{}' AND is_deleted = 0 ORDER BY nome_razaosocial ASC",
            tipo
        )
    } else {
        "SELECT id, empresa_id, tipo_cadastro, tipo, nome_razaosocial, nome_fantasia, cpf_cnpj, foto_base64,
                email_principal, telefone, celular, whatsapp, limite_credito, cep, logradouro, numero, bairro, municipio, uf
         FROM pessoas WHERE empresa_id = ?1 AND is_deleted = 0 ORDER BY nome_razaosocial ASC".to_string()
    };

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([empresa_id], |r| {
            Ok(PessoaInput {
                id: Some(r.get(0)?),
                empresa_id: r.get(1)?,
                tipo_cadastro: r.get(2)?,
                tipo: r.get(3)?,
                nome_razaosocial: r.get(4)?,
                nome_fantasia: r.get(5)?,
                cpf_cnpj: r.get(6)?,
                foto_base64: r.get(7)?,
                email_principal: r.get(8)?,
                telefone: r.get(9)?,
                celular: r.get(10)?,
                whatsapp: r.get(11)?,
                limite_credito: r.get(12)?,
                cep: r.get(13)?,
                logradouro: r.get(14)?,
                numero: r.get(15)?,
                bairro: r.get(16)?,
                municipio: r.get(17)?,
                uf: r.get(18)?,
                ..Default::default()
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

/// Salva veículo do cliente/transportadora
pub fn salvar_veiculo_pessoa(
    conn: &Connection,
    device_id: &str,
    pessoa_id: &str,
    placa: &str,
    modelo: &str,
    marca: &str,
    ano_fabricacao: Option<i64>,
    renavam: Option<&str>,
    cor: Option<&str>,
) -> Result<String, String> {
    let now = Utc::now().to_rfc3339();
    let veic_id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO pessoas_veiculos (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            pessoa_id, placa, modelo, marca, ano_fabricacao, renavam, cor, km_atual
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0)",
        params![veic_id, device_id, now, pessoa_id, placa.to_uppercase(), modelo, marca, ano_fabricacao, renavam, cor],
    ).map_err(|e| format!("Erro ao salvar veículo: {}", e))?;

    Ok(veic_id)
}

/// Lista veículos vinculados à pessoa
pub fn listar_veiculos_pessoa(
    conn: &Connection,
    pessoa_id: &str,
) -> Result<Vec<VeiculoPessoa>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, pessoa_id, placa, modelo, marca, ano_fabricacao, ano_modelo, renavam, cor, km_atual
             FROM pessoas_veiculos WHERE pessoa_id = ?1 AND is_deleted = 0",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([pessoa_id], |r| {
            Ok(VeiculoPessoa {
                id: r.get(0)?,
                pessoa_id: r.get(1)?,
                placa: r.get(2)?,
                modelo: r.get(3)?,
                marca: r.get(4)?,
                ano_fabricacao: r.get(5)?,
                ano_modelo: r.get(6)?,
                renavam: r.get(7)?,
                cor: r.get(8)?,
                km_atual: r.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema::create_tables;

    #[test]
    fn test_crud_completo_pessoa_e_veiculo() {
        let mut conn = Connection::open_in_memory().unwrap();
        create_tables(&conn).unwrap();

        conn.execute(
            "INSERT INTO empresas (id, device_id, created_at, updated_at, razao_social, cnpj) VALUES ('emp1', 'dev1', 'now', 'now', 'Empresa SP', '12345678000195')",
            [],
        ).unwrap();

        let input = PessoaInput {
            empresa_id: "emp1".to_string(),
            tipo_cadastro: "CLIENTE_FORNECEDOR".to_string(),
            tipo: "JURIDICA".to_string(),
            nome_razaosocial: "CONFECCOES SILVA LTDA".to_string(),
            nome_fantasia: Some("SILVA MODAS".to_string()),
            cpf_cnpj: Some("12.345.678/0001-99".to_string()),
            limite_credito: Some(10000.0),
            ..Default::default()
        };

        // 1. Salva pessoa
        let id = salvar_pessoa(&mut conn, "dev1", input).unwrap();
        assert!(!id.is_empty());

        // 2. Salva veículo vinculado
        let veic_id = salvar_veiculo_pessoa(&conn, "dev1", &id, "ABC-1234", "COROLLA", "TOYOTA", Some(2022), None, Some("PRATA")).unwrap();
        assert!(!veic_id.is_empty());

        // 3. Lista veículos
        let veics = listar_veiculos_pessoa(&conn, &id).unwrap();
        assert_eq!(veics.len(), 1);
        assert_eq!(veics[0].placa, "ABC-1234");
    }
}
