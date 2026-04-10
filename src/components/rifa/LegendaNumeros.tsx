export default function LegendaNumeros() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded bg-white border-2 border-gray-200" />
        <span className="text-gray-600">Disponível</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded bg-red-600" />
        <span className="text-gray-600">Selecionado</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded bg-amber-400" />
        <span className="text-gray-600">Reservado</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded bg-blue-500" />
        <span className="text-gray-600">Pago</span>
      </div>
    </div>
  )
}
