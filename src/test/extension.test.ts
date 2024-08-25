import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Hover Provider Test", async () => {
    const uri = vscode.Uri.file(
      path.join(__dirname, "..", "testFixture", "test.vue")
    );
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    const position = new vscode.Position(10, 15); // Adjust the position to where the color code is in your test file
    const hover = await vscode.commands.executeCommand<vscode.Hover[]>(
      "vscode.executeHoverProvider",
      uri,
      position
    );

    assert.ok(hover, "Hover is null or undefined");
    assert.ok(hover.length > 0, "No hover results");
    assert.ok(hover[0].contents.length > 0, "Hover contents are empty");
  });
});
