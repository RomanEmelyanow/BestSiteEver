import { styled } from '@mui/system' // placeholder - would use actual CSS-in-JS

export default function RequestCard({ request, onStatusChange, onAddComment }) {
  const statusIndicators = {
    pending: { color: 'green', label: '🟢' },
    urgent: { color: 'blue', label: '🔵' },
    longterm: { color: 'yellow', label: '🟡' },
    completed: { color: 'white', label: '⚪' },
    impossible: { color: 'red', label: '🔴' },
  }

  const statusStyle = statusIndicators[request.status] || { color: 'gray', label: '⚪' }

  return (
    <div className="request-card">
      <div className="card-header">
        <span className="status-indicator" style={{ color: statusStyle.color }}>{statusStyle.label}</span>
        <h3 className="card-title">{request.title}</h3>
      </div>
      <p className="card-description">
        {request.description}
      </p>
      <div className="card-meta">
        <span>Отправитель: {request.sender_name}</span>
        <span>→ {request.recipient_group}</span>
        <span>Кабинет: {request.classroom_number}</span>
      </div>
      <div className="card-actions">
        {request.canEdit && (
          <>
            <button
              onClick={() => onStatusChange(request.status)}
              className="status-btn"
            >
              Изменить статус
            </button>
            <button
              onClick={() => onAddComment(request.id)}
              className="comment-btn"
            >
              Комментарий
            </button>
          </>
        )}
      </div>
    </div>
  )
}