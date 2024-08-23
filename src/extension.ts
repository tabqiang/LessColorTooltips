import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"

export function activate(context: vscode.ExtensionContext) {
	const provider = vscode.languages.registerHoverProvider("less", {
		async provideHover(document, position, token) {
			const range = document.getWordRangeAtPosition(
				position,
				/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*\d+)?\s*\)/
			)
			if (range) {
				const word = document.getText(range)
				const properties = await findPropertiesInProject(word)
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

async function findPropertiesInProject(color: string): Promise<string[]> {
	const properties: string[] = []
	const config = vscode.workspace.getConfiguration("lessColorTooltip")
	const relativeFilePath = config.get<string>("filePath")
	if (!relativeFilePath) {
		return properties
	}

	const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath
	if (!rootPath) {
		return properties
	}

	const filePath = path.join(rootPath, relativeFilePath)
	const stat = await fs.promises.stat(filePath)
	if (stat.isDirectory()) {
		await searchFiles(filePath, color, properties)
	} else {
		const content = await fs.promises.readFile(filePath, "utf-8")
		const regex = new RegExp(
			`--(\\w+(?:-\\w+)*):\\s*${escapeRegExp(color)}\\b`,
			"g"
		)
		let match
		while ((match = regex.exec(content)) !== null) {
			properties.push(match[1])
		}
	}

	return properties
}

async function searchFiles(dir: string, color: string, properties: string[]) {
	const files = await fs.promises.readdir(dir)
	for (const file of files) {
		const filePath = path.join(dir, file)
		const stat = await fs.promises.stat(filePath)
		if (stat.isDirectory()) {
			await searchFiles(filePath, color, properties)
		} else if (filePath.endsWith(".less") || filePath.endsWith(".css")) {
			const content = await fs.promises.readFile(filePath, "utf-8")
			const regex = new RegExp(
				`--(\\w+(?:-\\w+)*):\\s*${escapeRegExp(color)}\\b`,
				"g"
			)
			let match
			while ((match = regex.exec(content)) !== null) {
				properties.push(match[1])
			}
		}
	}
}

function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function deactivate() {}
