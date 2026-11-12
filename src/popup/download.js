const slug = (name) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

export function downloadJson(name, json) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  link.download = `claude-censor-${slug(name) || 'pack'}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
