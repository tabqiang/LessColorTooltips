import * as vscode from "vscode"

export function activate(context: vscode.ExtensionContext) {
	const provider = vscode.languages.registerHoverProvider("less", {
		provideHover(document, position, token) {
			const range = document.getWordRangeAtPosition(
				position,
				/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*\d+)?\s*\)/
			)
			if (range) {
				const word = document.getText(range)
				const properties = findProperties(document, word)
				if (properties.length > 0) {
					const formattedProperties = properties.map(prop => `@${prop}`)
					return new vscode.Hover(
						new vscode.MarkdownString(formattedProperties.join("\r\n"))
					)
				}
			}
			return null
		},
	})

	context.subscriptions.push(provider)
}

function findProperties(
	document: vscode.TextDocument,
	color: string
): string[] {
	const properties: string[] = []
	const text = document.getText()
	const regex = new RegExp(
		`--(\\w+(?:-\\w+)*):\\s*${escapeRegExp(color)}\\b`,
		"g"
	)
	let match
	while ((match = regex.exec(text)) !== null) {
		properties.push(match[1])
	}
	return properties
}

function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function deactivate() {}
