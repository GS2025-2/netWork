export default function ProfileCard({ profile, onOpen }) {
  const handleOpen = (e) => {
    e.stopPropagation()
    onOpen(profile)
  }

  return (
    <article
      onClick={handleOpen}
      className="profile-card cursor-pointer hover:-translate-y-1 transition-transform duration-200 bg-white dark:bg-[color:var(--linkedin-card-dark)] rounded-2xl shadow-md p-4 sm:p-6"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleOpen(e)}
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
        <img src={profile.foto} alt={profile.nome} className="profile-img" />
        <div>
          <h3 className="profile-name text-lg font-semibold">{profile.nome}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">{profile.cargo}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{profile.localizacao}</p>
        </div>
      </div>

      <p className="text-sm mt-3 text-gray-700 dark:text-gray-300 line-clamp-3">{profile.resumo}</p>

      <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
        {(profile.habilidadesTecnicas || []).slice(0, 5).map((s, i) => (
          <span key={i} className="skill">{s}</span>
        ))}
      </div>

      <div className="mt-4 flex justify-center sm:justify-start">
        <button onClick={handleOpen} className="btn-secondary">Ver perfil</button>
      </div>
    </article>
  )
}
