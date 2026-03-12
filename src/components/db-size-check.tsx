'use client';

import { useState } from 'react';

export function DbSizeCheck() {
  const [size, setSize] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const checkSize = async () => {
    setLoading(true);
    try {
      // Verificar tamanho do localStorage
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      
      // Converter para KB/MB
      const sizeKB = (totalSize / 1024).toFixed(2);
      const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
      
      setSize(`${sizeKB} KB (${sizeMB} MB)`);
      
      // Verificar especificamente o banco SQLite
      const dbData = localStorage.getItem('agentic-pomodoro-db');
      if (dbData) {
        const dbSizeKB = (dbData.length / 1024).toFixed(2);
        console.log(`Banco SQLite: ${dbSizeKB} KB`);
        console.log(`Total localStorage: ${sizeKB} KB`);
      }
      
    } catch (err) {
      console.error('Erro:', err);
      setSize('Erro ao verificar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-4 left-4 bg-black/90 text-white p-3 rounded-lg text-xs z-50">
      <button
        onClick={checkSize}
        disabled={loading}
        className="bg-blue-600 px-3 py-1 rounded mb-2"
      >
        {loading ? 'Verificando...' : 'Ver tamanho DB'}
      </button>
      {size && (
        <div>
          <p>Tamanho: {size}</p>
          <p className="text-gray-400">Limite: ~5-10MB</p>
        </div>
      )}
    </div>
  );
}
