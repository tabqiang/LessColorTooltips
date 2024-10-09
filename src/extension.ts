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
	const themePath = config.get<string>("themePath")
	const variablePath = config.get<string>("variablePath")

	if (!themePath || !variablePath) {
		return properties
	}

	const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath
	if (!rootPath) {
		return properties
	}

	// 处理 themePath 和 variablePath
	const resolvedThemePath = resolveFilePath(rootPath, themePath)
	const resolvedVariablePath = resolveFilePath(rootPath, variablePath)

	// 在 themePath 文件中查找与 color 匹配的自定义属性
	const themeProperties = await searchFileForColor(resolvedThemePath, color)
	outputChannel.appendLine(
		`Found ${themeProperties.toString()} theme properties`
	)

	// 在 variablePath 文件中查找使用了这些自定义属性的 less 变量
	for (const property of themeProperties) {
		const variableProperties = await searchFileForVariable(
			resolvedVariablePath,
			property
		)
		outputChannel.appendLine(
			`Found ${variableProperties.toString()} variables for ${property}`
		)
		properties.push(...variableProperties)
	}

	outputChannel.appendLine(`Found ${properties.toString()} properties`)
	return properties
}

function resolveFilePath(rootPath: string, relativeFilePath: string): string {
	// 如果 relativeFilePath 是绝对路径，则去掉 rootPath 部分
	if (path.isAbsolute(relativeFilePath)) {
		relativeFilePath = path.relative(rootPath, relativeFilePath)
	}
	return path.resolve(rootPath, relativeFilePath)
}

async function searchFileForColor(
	filePath: string,
	color: string
): Promise<string[]> {
	const properties: string[] = []
	const content = await fs.promises.readFile(filePath, "utf-8")
	const lines = content.split("\n")

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(color)) {
			let property = lines[i].split(":")[0].replace(/--| /g, "")
			properties.push(property)
		}
	}

	return properties
}

async function searchFileForVariable(
	filePath: string,
	property: string
): Promise<string[]> {
	const variableList: string[] = []
	const content = await fs.promises.readFile(filePath, "utf-8")
	const lines = content.split("\n")

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(property)) {
			let variable = lines[i].split(":")[0].replace(/@| /g, "")
			if (i > 0 && lines[i - 1].trim().startsWith("/*")) {
				const comment = lines[i - 1]
					.trim()
					.replace(/\/\*|\*\//g, "")
					.trim()
				variable = `${variable}: ${comment}`
			}
			//去重再push
			if (!variableList.includes(variable)) {
				variableList.push(variable)
			}
		}
	}

	return variableList
}
