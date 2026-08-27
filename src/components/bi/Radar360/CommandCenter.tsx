import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Mic, AlertCircle } from 'lucide-react';
import { BIService } from '../../../services/biApi';

interface CommandCenterProps {
  onSelectCustomer: (customerId: number) => void;
}

interface SearchResult {
  id: number;
  nome: string;
  cnpj: string;
  ltv?: number;
  risco_churn_pct?: number;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ onSelectCustomer }) => {
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchInput.length >= 3) {
        setIsSearching(true);
        try {
          // The API now returns ltv and risco_churn_pct
          const results = await BIService.searchCustomers(searchInput);
          setSearchResults(results);
          setShowDropdown(true);
        } catch (error) {
          console.error("Search failed", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 400);

    return () => clearTimeout(searchTimer);
  }, [searchInput]);

  const handleSelectCustomer = (customer: SearchResult) => {
    setSearchInput('');
    setShowDropdown(false);
    onSelectCustomer(customer.id);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="relative w-full max-w-2xl mx-auto z-50" ref={dropdownRef}>
      <div className="flex items-center bg-bg-primary/80 backdrop-blur-md border border-border-primary rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-2 group">
        <Search className="text-brand-500 ml-3" size={20} />
        <input 
          type="text" 
          placeholder="Busque cliente por nome, documento ou use filtros naturais..." 
          className="flex-1 bg-transparent border-none focus:outline-none px-4 py-2 text-text-primary text-sm placeholder-text-muted"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
        />
        {isSearching ? (
          <Loader2 size={18} className="mr-3 text-text-muted animate-spin" />
        ) : (
          <button className="p-2 text-text-muted hover:text-brand-500 hover:bg-brand-500/10 rounded-full transition-colors mr-1">
            <Mic size={18} />
          </button>
        )}
      </div>

      {showDropdown && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-bg-primary/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="max-h-80 overflow-y-auto p-2 space-y-1">
            {searchResults.map((c) => (
              <li 
                key={c.id} 
                onClick={() => handleSelectCustomer(c)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-bg-secondary/80 cursor-pointer transition-all border border-transparent hover:border-border-primary"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-cyan-600 flex items-center justify-center text-white font-bold shadow-md">
                    {c.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-text-primary truncate max-w-[200px]">{c.nome}</div>
                    <div className="text-xs text-text-muted">{c.cnpj}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  {c.ltv !== undefined && (
                    <div className="hidden sm:block">
                      <div className="text-xs text-text-muted">Faturamento</div>
                      <div className="text-sm font-bold text-brand-500">{formatCurrency(c.ltv)}</div>
                    </div>
                  )}
                  {c.risco_churn_pct !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-text-muted text-right">
                        <div>Risco</div>
                        <div className={`font-bold ${c.risco_churn_pct > 50 ? 'text-danger' : c.risco_churn_pct > 20 ? 'text-warning' : 'text-success'}`}>
                          {c.risco_churn_pct}%
                        </div>
                      </div>
                      <AlertCircle size={20} className={c.risco_churn_pct > 50 ? 'text-danger' : c.risco_churn_pct > 20 ? 'text-warning' : 'text-success'} />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
