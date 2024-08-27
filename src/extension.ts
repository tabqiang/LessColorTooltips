import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"

export function activate(context: vscode.ExtensionContext) {
    const provider = vscode.languages.registerHoverProvider(["less", "vue"], {
        async provideHover(document, position, token) {
            const fileName = document.fileName
            if (fileName.endsWith(".vue")) {
                const text = document.getText()
                const styleTagRegex = /<style\s+lang=["']less["'][^>]*>([\s\S]*?)<\/style>/g
                let match
                while ((match = styleTagRegex.exec(text)) !== null) {
                    const styleContent = match[1]
                    const startPos = document.positionAt(match.index)
                    const endPos = document.positionAt(match.index + match[0].length)
                    const range = new vscode.Range(startPos, endPos)
                    if (range.contains(position)) {
                        const wordRange = document.getWordRangeAtPosition(
                            position,
                            /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*\d+)?\s*\)/i
                        )
                        if (wordRange) {
                            const word = document.getText(wordRange)
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
                const range = document.getWordRangeAtPosition(
                    position,
                    /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*\d+)?\s*\)/i
                )
                if (range) {
                    const word = document.getText(range)
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
        await searchFile(filePath, color, properties)
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
    const regex = new RegExp(
        `--(\\w+(?:-\\w+)*):\\s*${escapeRegExp(color)}\\b`,
        "gi"
    )

    for (let i = 0; i < lines.length; i++) {
        let match
        while ((match = regex.exec(lines[i])) !== null) {
            let property = match[1]
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