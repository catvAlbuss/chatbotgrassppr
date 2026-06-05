export function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand:  'text-brand-400  bg-brand-500/10',
    amber:  'text-amber-400  bg-amber-500/10',
    blue:   'text-blue-400   bg-blue-500/10',
    red:    'text-red-400    bg-red-500/10',
  }
  return (
    <div className="card flex items-start gap-4">
      <div className={`rounded-xl p-3 ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-400 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-100">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
