const ALLOWED = /^(br|span)$/i;

export function sanitizeHtml(html: string) {
	if (!html) return '';
	return String(html).replace(
		/<\/?([a-z0-9]+)(\s[^>]*)?>/gi,
		(full, tag: string, attrs = '') => {
			if (!ALLOWED.test(tag)) return '';
			if (tag.toLowerCase() === 'br') return '<br />';
			if (full.startsWith('</')) return '</span>';
			const cls = /class\s*=\s*["']money["']/i.test(attrs)
				? ' class="money"'
				: '';
			return `<span${cls}>`;
		},
	);
}
