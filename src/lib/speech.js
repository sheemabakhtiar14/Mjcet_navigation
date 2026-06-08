export function speak(text) {
  if (!window.speechSynthesis) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-IN'
  utterance.rate = 1
  window.speechSynthesis.speak(utterance)
}

export function confirmNavigation(label) {
  speak(`Navigating to ${label}.`)
}

export function announceNotFound() {
  speak('Destination not found.')
}
