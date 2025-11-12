import React, { useEffect, useState } from 'react'
import Header from './components/Header'
import ProfileCard from './components/ProfileCard'
import ProfileModal from './components/ProfileModal'
import SearchFilters from './components/SearchFilters'
import DarkModeToggle from './components/DarkModeToggle'
import { getInitialTheme, setTheme } from './utils/localStorageTheme'

// Tempo máximo antes de considerar que os dados estão "parados" (20 segundos)
const STALE_THRESHOLD = 20000; 

// Dados fictícios exibidos quando os sensores estão desligados
const DADOS_FICTICIOS_FALLBACK = {
    temperatura: null, 
    luminosidade: null,
    som: null,
    status: 'Dados fictícios, sensores desligados',
    isFallback: true,
};

// Função para comparar valores numéricos com uma pequena margem de erro
const isCloseTo = (v1, v2, tolerance = 0.1) => {
    if (v1 === null || v2 === null) return v1 === v2;
    if (typeof v1 !== 'number' || typeof v2 !== 'number') return false; 
    return Math.abs(v1 - v2) < tolerance;
};

// Compara dois conjuntos de dados dos sensores, ignorando pequenas variações
const areSameData = (d1, d2) => {
    if (!d1 || !d2) return d1 === d2;
    
    const stringsMatch = d1.status === d2.status && !!d1.isFallback === !!d2.isFallback;
    const numbersMatch = isCloseTo(d1.temperatura, d2.temperatura) &&
                         isCloseTo(d1.luminosidade, d2.luminosidade) &&
                         isCloseTo(d1.som, d2.som);
                         
    return stringsMatch && numbersMatch;
};

export default function App() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ area: '', localizacao: '' })
  const [theme, setThemeState] = useState(getInitialTheme())
  const [dadosSensores, setDadosSensores] = useState(DADOS_FICTICIOS_FALLBACK) 
  const [ultimoUpdate, setUltimoUpdate] = useState(Date.now()) // Guarda o momento da última atualização real

  // Alterna entre modo claro e escuro
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    setTheme(theme)
  }, [theme])

  // Carrega os perfis locais do arquivo JSON
  useEffect(() => {
    fetch('/data/profiles.json')
      .then((r) => r.json())
      .then((data) => setProfiles(data))
      .catch(() => console.error('Erro ao carregar perfis'))
      .finally(() => setLoading(false))
  }, [])

  // Atualiza os dados dos sensores (vindo do Node-RED) com verificação de estagnação
  useEffect(() => {
    async function atualizarBemEstar() {
      let novosDadosSensores = DADOS_FICTICIOS_FALLBACK;
      let success = false;

      try {
        const response = await fetch('http://localhost:1880/sensores', { cache: 'no-store' })
        
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}.`)
        }

        const sensores = await response.json()
        
        if (!sensores || typeof sensores !== 'object' || Object.keys(sensores).length === 0) {
          throw new Error('JSON inválido ou vazio recebido.')
        }

        // Converte todos os valores para número e trata o texto de status
        novosDadosSensores = {
            temperatura: parseFloat(sensores.temperatura) ?? null, 
            luminosidade: parseFloat(sensores.luminosidade) ?? null,
            som: parseFloat(sensores.som) ?? null,
            status: sensores.status && sensores.status.trim() !== ''
              ? sensores.status
              : 'Ambiente não identificado',
            isFallback: false,
        };
        success = true;
        
      } catch (error) {
        console.warn('Erro na comunicação ou dados inválidos:', error.message)
        novosDadosSensores = DADOS_FICTICIOS_FALLBACK;
      }

      const dataHasChanged = !areSameData(dadosSensores, novosDadosSensores);
      const isCurrentlyReal = dadosSensores && dadosSensores.temperatura !== null;
      const timeElapsed = Date.now() - ultimoUpdate;

      // Se os dados não mudam por muito tempo, assume que estão estagnados e volta pro modo fictício
      if (success && !dataHasChanged && isCurrentlyReal && timeElapsed > STALE_THRESHOLD) {
        console.warn(`Dados estagnados por mais de ${STALE_THRESHOLD / 1000}s. Voltando para dados fictícios.`);
        setDadosSensores(DADOS_FICTICIOS_FALLBACK);
        return; 
      }
      
      // Atualiza apenas se houve mudança real ou reconexão
      if (dataHasChanged) {
        setDadosSensores(novosDadosSensores);
        if (success) {
            setUltimoUpdate(Date.now());
        }
      }
    }

    // Atualiza a cada 5 segundos
    const interval = setInterval(atualizarBemEstar, 5000)
    atualizarBemEstar() 
    return () => clearInterval(interval)
  }, [dadosSensores, ultimoUpdate]) 

  // Associa os dados dos sensores a cada perfil
  const perfisComBemEstar = profiles.map((p) => ({
    ...p,
    bemEstar: dadosSensores, 
  }))

  // Aplica filtros e pesquisa
  const filtered = perfisComBemEstar.filter((p) => {
    const matchQuery = [p.nome, p.cargo, (p.habilidadesTecnicas || []).join(' ')].join(' ').toLowerCase().includes(query.toLowerCase())
    const matchArea = filters.area ? p.area === filters.area : true
    const matchLoc = filters.localizacao ? p.localizacao.toLowerCase().includes(filters.localizacao.toLowerCase()) : true
    return matchQuery && matchArea && matchLoc
  })

  // Controle do modal
  const openProfile = (profile) => setSelected(profile)
  const closeProfile = () => setSelected(null)

  return (
    <div className="min-h-screen bg-[color:var(--linkedin-light)] dark:bg-[color:var(--linkedin-dark)]">
      <Header />
      <div className="container py-6">
        <div className="flex justify-between items-center mb-4">
          <SearchFilters query={query} setQuery={setQuery} filters={filters} setFilters={setFilters} profiles={perfisComBemEstar} />
          <DarkModeToggle theme={theme} setTheme={setThemeState} />
        </div>

        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-300 py-10">Carregando perfis...</div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <ProfileCard key={p.id} profile={p} onOpen={() => openProfile(p)} />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-10">Nenhum perfil encontrado.</div>
        )}

        {selected && <ProfileModal profile={selected} onClose={closeProfile} />}
      </div>
    </div>
  )
}
