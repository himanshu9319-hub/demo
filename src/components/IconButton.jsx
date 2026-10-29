export function IconButton({ children, onClick, label, className = '' }) {
  return <button type="button" aria-label={label} onClick={onClick} className={'icon-button ' + className}>{children}</button>
}
