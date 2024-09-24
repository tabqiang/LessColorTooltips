import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"

const outputChannel = vscode.window.createOutputChannel("Less Color Tooltip")
export function activate(context: vscode.ExtensionContext) {
	outputChannel.appendLine(
		'Congratulations, your extension "less-color-tooltip" is now active!'
	)
	const provider = vscode.languages.registerHoverProvider(["less", "vue"], {
		async provideHover(document, position, token) {
			const fileName = document.fileName
			const colorRegex =
				/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*\d+(\.\d+)?)?\s*\)/i

			if (fileName.endsWith(".vue")) {
				const text = document.getText()
				const styleTagRegex =
					/<style\s+lang=["']less["'][^>]*>([\s\S]*?)<\/style>/g
				let match
				while ((match = styleTagRegex.exec(text)) !== null) {
					const styleContent = match[1]
					const startPos = document.positionAt(match.index)
					const endPos = document.positionAt(match.index + match[0].length)
					const range = new vscode.Range(startPos, endPos)
					if (range.contains(position)) {
						const wordRange = document.getWordRangeAtPosition(
							position,
							colorRegex
						)
						if (wordRange) {
							let word = document.getText(wordRange)
							const properties = await findPropertiesInProject(word)
							if (properties.length > 0) {
								const formattedProperties = properties
									.map(prop => `@${prop}`)
									.join("\n\n")
								return new vscode.Hover(
									new vscode.MarkdownString(formattedProperties)
								)
							}
						}
					}
				}
			} else {
				const range = document.getWordRangeAtPosition(position, colorRegex)
				if (range) {
					let word = document.getText(range)
					const properties = await findPropertiesInProject(word)
					if (properties.length > 0) {
						const formattedProperties = properties
							.map(prop => `@${prop}`)
							.join("\n\n")
						return new vscode.Hover(
							new vscode.MarkdownString(formattedProperties)
						)
					}
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
	let relativeFilePath = config.get<string>("filePath")

	if (!relativeFilePath) {
		return properties
	}

	const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath
	if (!rootPath) {
		return properties
	}

	// 如果 relativeFilePath 是绝对路径，则去掉 rootPath 部分
	if (path.isAbsolute(relativeFilePath)) {
		relativeFilePath = path.relative(rootPath, relativeFilePath)
	}

	const filePath = path.join(rootPath, relativeFilePath)
	outputChannel.appendLine(`Searching for color ${color} in ${filePath}`)
	const stat = await fs.promises.stat(filePath)
	if (stat.isDirectory()) {
		await searchFiles(filePath, color, properties)
	} else {
		await searchFile(filePath, color, properties)
	}

	outputChannel.appendLine(`Found ${properties.toString()} properties`)
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
			await searchFile(filePath, color, properties)
		}
	}
}

async function searchFile(
	filePath: string,
	color: string,
	properties: string[]
) {
	const content = await fs.promises.readFile(filePath, "utf-8")
	const lines = content.split("\n")

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(color)) {
			//兼容rgb格式
			//从lines[i]数据中--popover-shadow-color: rgba(205, 210, 218,0.4)先配出--popover-shadow-color，再去掉前面的--和空格
			let property = lines[i].split(":")[0].replace(/--| /g, "")
			if (i > 0 && lines[i - 1].trim().startsWith("/*")) {
				const comment = lines[i - 1]
					.trim()
					.replace(/\/\*|\*\//g, "")
					.trim()
				property = `${property}: ${comment}`
			}
			properties.push(property)
		}
	}
}

function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function deactivate() {}
