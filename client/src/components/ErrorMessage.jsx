import './ErrorMessage.css'

export default function ErrorMessage({ message, onDismiss }) {
  return (
    <div className="error-banner">
      <span>{message}</span>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  )
}
