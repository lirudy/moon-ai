// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import OpenAI from "openai";
import { sleep } from 'openai/core.mjs';

//读取当前用户目录下的moon-ai.json，如果没有存在，则创建一个
const home = require('os').homedir();
const path = require('path');
const fs = require('fs');
const filePath = path.join(home, '.moon-ai.json');
if (!fs.existsSync(filePath)) {
	fs.writeFileSync(filePath, '{}');
}
//读取文件到conf全局变量中, 转换为json格式
const conf = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const openai = new OpenAI({
	apiKey: conf['apiKey'],
	baseURL: conf['baseURL']
});




// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	
	

	// 解释代码命令
	let explain = vscode.commands.registerCommand('moon-ai.explain', () => {
	    //获取当前选择行，并弹出框显示出来
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const selection = editor.selection;
			const selectedText = editor.document.getText(selection);
			vscode.window.showInformationMessage(selectedText);
			//将selectedText放入content中				
			const chatCompletion = openai.chat.completions.create({
				messages: [{ role: "user", content: "请不要修改代码，分析代码并用中文注释所有代码，同时用注释标注出可能的问题：" + selectedText }],
				model: conf["model"],
				max_tokens: 4000,
			}).then((response) => {
				//输出response的内容到控制台
				const resp = response.choices[0].message.content;
				console.log(resp);
				//判断resp不为空，则插入到到当前光标位置
				if (resp) {
					editor.edit(editBuilder => {
						editBuilder.insert(editor.selection.active, resp);
					})
				}
			  }).catch((error) => {
				console.log(error);
			  });

		}
	});

	let autocompl = vscode.commands.registerCommand('moon-ai.autocompl', () => {
	    //获取当前选择行，并弹出框显示出来
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const selection = editor.selection;
			const selectedText = editor.document.getText(selection);
			vscode.window.showInformationMessage(selectedText);
			//将selectedText放入content中
			const chatCompletion = openai.completions.create({
				model: conf["model"],
				prompt: selectedText,
				max_tokens: 100,
			//const chatCompletion = openai.chat.completions.create({
			//	messages: [{ role: "user", content: "请按最后的注释完成代码，只写代码和注释：" + selectedText }],
			//	model: conf["model"],
			}).then((response) => {
				//输出response的内容到控制台
				//const resp = response.choices[0].message.content;
				const resp = response.choices[0].text;
				console.log(resp);
				//判断resp不为空，则插入到到当前光标位置
				if (resp) {
					editor.edit(editBuilder => {
						editBuilder.insert(editor.selection.active, resp);
					})
				}
			  }).catch((error) => {
				console.log(error);
			  });

		}
	})

	context.subscriptions.push(explain);
	context.subscriptions.push(autocompl);

	const suggestProvider: vscode.InlineCompletionItemProvider = {
		async provideInlineCompletionItems(document, position, context, token) {

			console.log("-----");

			const editor = vscode.window.activeTextEditor;

			if (!editor) {
				return;
			}

			const currentPosition = editor.selection.active;
			await new Promise((f) => setTimeout(f, 5000));
			const secondPosition = editor.selection.active;

			if (currentPosition === secondPosition) {
				console.log("可以开始处理...");
			} else {				
				return;
			}


			const process = vscode.window.setStatusBarMessage("银月AI正在处理中...");
			
			const selection = editor.selection;


			// 获取向上5行的数据
			const selectRect = new vscode.Selection(currentPosition.line > 5 ? currentPosition.line - 5 : 0,
				0,
				currentPosition.line,
				currentPosition.character
			);
			const selectedText = document.getText(selectRect).trim();			
			
			const result: vscode.InlineCompletionList = {
				items: [],
			};

			const chatCompletion = await openai.completions.create({
				model: conf["model"],
				prompt: selectedText,
				max_tokens: 100,
			}).then((response) => {
				const resp = response.choices[0].text;			
				if (resp) {					
					result.items.push({
						insertText: new vscode.SnippetString(resp),
						range: new vscode.Range(currentPosition.translate(0, resp.length), currentPosition), 												
					});					
				};
			}).catch((error) => {
				console.log(error);
			});
			
			process.dispose();
			
			return result;

            },
	};


	
	context.subscriptions.push(
		vscode.languages.registerInlineCompletionItemProvider({ pattern: "**" },
			suggestProvider
		)
	);

	console.log('你好 银月AI已经启动!');

	

}

// This method is called when your extension is deactivated
export function deactivate() {}
