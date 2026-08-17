export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="my-8 border border-crimson/30 bg-crimson/5 px-4 py-4 text-center">
      <p className="font-gujarati text-crimson">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm underline text-ink/70 hover:text-crimson"
        >
          ફરી પ્રયાસ કરો
        </button>
      )}
    </div>
  );
}
