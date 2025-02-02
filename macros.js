// Copyright 2024 Yoshi Yamaguchi
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

module.exports.macroCommands = {
    RemoveCFLRandSpace: {
        no: 1,
        func: removeCFLRandSpace
    },
    RemoveReSTCFLRandSpace: {
        no: 2,
        func: removeReSTCFLRandSpace
    },
    ReplaceWordsInDictionary: {
        no: 3,
        func: replaceWordsInDictionary
    }
};

function removeCFLRandSpace() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return 'Editor is not opening';
    }
    const document = editor.document;
    const selection = editor.selection;
    const text = document.getText(selection);
    if (text.length == 0) {
        return
    }
    // find indent size
    const start_line = selection.start.line;
    const line_text = document.lineAt(start_line);
    const indent_size = line_text.text.match(/^ */)[0].length;
    let tmp = text.replace(/\r?\n/g, ' ');
    tmp = " ".repeat(indent_size) + tmp.replace(/\s+/g, " ");
    editor.edit(editBuilder => {
        editBuilder.replace(selection, tmp);
    });
}

function removeReSTCFLRandSpace() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return 'Editor is not opening';
    }
    const document = editor.document;
    const selection = editor.selection;
    const text = document.getText(selection);
    if (text.length == 0) {
        return
    }
    // find indent size
    const start_line = selection.start.line;
    const line_text = document.lineAt(start_line);
    const indent_size = line_text.text.match(/^ */)[0].length;
    const new_text = add_indent(text, indent_size)
    // format
    // 1. replace new line char with space
    // 2. remove reST footnote markup
    // 3. remove reST hyperlinks
    // 4. add indent and replace multiple spaces with single space
    let tmp = text.replace(/\r?\n/g, ' ');
    tmp = tmp.replace(/\[#\]_/g, '');
    tmp = tmp.replace(/`([\w# ]+\w) <\S+>`__/g, "$1");
    tmp = " ".repeat(indent_size) + tmp.replace(/\s+/g, " ");
    const comment_header = "..\n" + " ".repeat(indent_size)
    editor.edit(editBuilder => {
        editBuilder.replace(selection, comment_header + new_text + "\n\n" + tmp);
    });
}

function add_indent(original, size) {
    const lines = original.split(/\n/);
    const new_lines = lines.map(line => {
        return "  " + line;
    });
    return new_lines.join("\n");
}

function replaceWordsInDictionary() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return 'Editor is not opening';
    }
    const document = editor.document;
    const selection = editor.selection;
    const text = document.getText(selection);
    if (text.length == 0) {
        return
    }
    const resource = vscode.window.activeTextEditor.document.uri;
    const folder = vscode.workspace.getWorkspaceFolder(resource);
    console.log(folder);
    const uri = path.join(folder.uri.fsPath, "replace.dic");
    const dictionary = fs.readFileSync(uri, 'utf-8');

    // find indent size
    const start_line = selection.start.line;
    const line_text = document.lineAt(start_line);
    const indent_size = line_text.text.match(/^ */)[0].length;

    let tmp = text;
    dictionary.split(/\r?\n/).forEach(line => {
        if (line[0] == '#' || line.length == 0) {
            return;
        }
        const kv = line.split('\t');
        const key = new RegExp(kv[0], 'g');
        const value = kv[1];
        tmp = tmp.replace(key, value);
    });

    // insert CLRF at Japanese punctuations
    if ((tmp.match('\n') || []).length < 2) {
        tmp = tmp.split(/。/).map(line => {
            return " ".repeat(indent_size) + line
        }).join('。\n');
    }

    editor.edit(editBuilder => {
        editBuilder.replace(selection, tmp);
    });
}