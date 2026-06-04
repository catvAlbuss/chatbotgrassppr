const COLORS = {
  CONFIRMADA:            'bg-brand-500/20 text-brand-400 border-brand-500/30',
  EN_REVISION:           'bg-amber-500/20 text-amber-400 border-amber-500/30',
  COMPROBANTE_ENVIADO:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PENDIENTE_PAGO:        'bg-gray-500/20 text-gray-400 border-gray-500/30',
  RECHAZADA:             'bg-red-500/20 text-red-400 border-red-500/30',
  CANCELADA_TIMEOUT:     'bg-red-900/20 text-red-300 border-red-700/30',
  CANCELADA_SLOTS_OCUPADOS: 'bg-red-900/20 text-red-300 border-red-700/30',
};

const LABELS = {
  CONFIRMADA:            '✅ Confirmada',
  EN_REVISION:           '🔍 En revisión',
  COMPROBANTE_ENVIADO:   '📸 Comprobante enviado',
  PENDIENTE_PAGO:        '⏳ Pendiente pago',
  RECHAZADA:             '❌ Rechazada',
  CANCELADA_TIMEOUT:     '⏰ Cancelada (timeout)',
  CANCELADA_SLOTS_OCUPADOS: '⚠️ Slots ocupados',
};

export function Badge({ estado }) {
  const cls = COLORS[estado] || 'bg-gray-700 text-gray-300 border-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {LABELS[estado] || estado}
    </span>
  );
}
