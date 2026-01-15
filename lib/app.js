// CodeMirror エディタのインスタンス
let editor;

// DOM 要素
const fileInput = document.getElementById("fileInput");
const loadFileBtn = document.getElementById("loadFile");
const downloadFileBtn = document.getElementById("downloadFile");
const formatWrapBtn = document.getElementById("formatWrap");
const alignLeftBtn = document.getElementById("alignLeft");
const alignCenterBtn = document.getElementById("alignCenter");
const alignRightBtn = document.getElementById("alignRight");
const indentSizeInput = document.getElementById("indentSize");
const applyIndentBtn = document.getElementById("applyIndent");
const lineWidthInput = document.getElementById("lineWidth");
const lineCountSpan = document.getElementById("lineCount");
const charCountSpan = document.getElementById("charCount");
const selectionInfoSpan = document.getElementById("selectionInfo");

// 初期化
document.addEventListener("DOMContentLoaded", () => {
  initEditor();
  setupEventListeners();
});

// エディタの初期化
function initEditor() {
  editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    lineWrapping: false,
    mode: "text/plain",
    theme: "default",
    tabSize: 4,
    indentUnit: 4,
    viewportMargin: Infinity,
  });

  // エディタの変更イベント
  editor.on("change", updateStats);
  editor.on("cursorActivity", updateSelectionInfo);

  // 初期統計更新
  updateStats();
}

// イベントリスナーの設定
function setupEventListeners() {
  loadFileBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileLoad);
  downloadFileBtn.addEventListener("click", handleDownload);
  formatWrapBtn.addEventListener("click", formatWrap);
  alignLeftBtn.addEventListener("click", () => alignText("left"));
  alignCenterBtn.addEventListener("click", () => alignText("center"));
  alignRightBtn.addEventListener("click", () => alignText("right"));
  applyIndentBtn.addEventListener("click", applyIndent);
}

// ファイル読み込み
function handleFileLoad(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    editor.setValue(e.target.result);
    updateStats();
  };
  reader.readAsText(file);
}

// ファイルダウンロード
function handleDownload() {
  const content = editor.getValue();
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "formatted-text.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 指定文字数で折り返し
function formatWrap() {
  const width = parseInt(lineWidthInput.value) || 80;
  const selection = editor.getSelection();
  const hasSelection = selection.length > 0;

  let text;
  let startPos, endPos;

  if (hasSelection) {
    text = selection;
    startPos = editor.getCursor("start");
    endPos = editor.getCursor("end");
  } else {
    text = editor.getValue();
    startPos = { line: 0, ch: 0 };
    endPos = {
      line: editor.lastLine(),
      ch: editor.getLine(editor.lastLine()).length,
    };
  }

  const wrapped = wrapText(text, width);

  if (hasSelection) {
    editor.replaceSelection(wrapped);
  } else {
    editor.setValue(wrapped);
  }
}

// テキストを指定幅で折り返す
function wrapText(text, width) {
  const lines = text.split("\n");
  const wrappedLines = [];

  lines.forEach((line) => {
    if (line.length === 0) {
      wrappedLines.push("");
      return;
    }

    // 既存のインデントを保持
    const indent = line.match(/^\s*/)[0];
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0) {
      wrappedLines.push(indent);
      return;
    }

    const effectiveWidth = width - indent.length;
    const words = trimmedLine.split(/\s+/);
    let currentLine = indent;

    words.forEach((word) => {
      const testLine =
        currentLine === indent ? currentLine + word : currentLine + " " + word;

      if (getDisplayWidth(testLine) <= width) {
        currentLine = testLine;
      } else {
        if (currentLine !== indent) {
          wrappedLines.push(currentLine);
        }
        currentLine = indent + word;

        // 単語自体が長すぎる場合は強制的に分割
        while (
          getDisplayWidth(currentLine) > width &&
          currentLine.length > indent.length
        ) {
          const splitPoint = width - indent.length;
          wrappedLines.push(
            currentLine.substring(0, indent.length + splitPoint)
          );
          currentLine =
            indent + currentLine.substring(indent.length + splitPoint);
        }
      }
    });

    if (currentLine !== indent) {
      wrappedLines.push(currentLine);
    }
  });

  return wrappedLines.join("\n");
}

// 文字列の表示幅を計算（全角文字は2、半角文字は1としてカウント）
function getDisplayWidth(text) {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // 全角文字の判定（簡易版）
    if ((charCode > 0x7f && charCode < 0xff61) || charCode > 0xff9f) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

// テキストの揃え
function alignText(alignment) {
  const width = parseInt(lineWidthInput.value) || 80;
  const selection = editor.getSelection();
  const hasSelection = selection.length > 0;

  let text;
  if (hasSelection) {
    text = selection;
    const aligned = alignLines(text, alignment, width);
    editor.replaceSelection(aligned);
  } else {
    // 範囲指定がない場合は現在行のみを揃える
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const aligned = alignLines(line, alignment, width);
    editor.replaceRange(
      aligned,
      { line: cursor.line, ch: 0 },
      { line: cursor.line, ch: line.length }
    );
  }
}

// 行の揃え処理
function alignLines(text, alignment, width) {
  const lines = text.split("\n");
  const alignedLines = lines.map((line) => {
    if (line.trim().length === 0) return line;

    const trimmed = line.trim();
    const lineWidth = getDisplayWidth(trimmed);

    if (lineWidth >= width) return trimmed;

    const spaces = width - lineWidth;

    switch (alignment) {
      case "left":
        return trimmed;
      case "right":
        return " ".repeat(spaces) + trimmed;
      case "center":
        const leftSpaces = Math.floor(spaces / 2);
        return " ".repeat(leftSpaces) + trimmed;
      default:
        return line;
    }
  });

  return alignedLines.join("\n");
}

// インデントの適用
function applyIndent() {
  const indentSize = parseInt(indentSizeInput.value) || 0;
  const selection = editor.getSelection();
  const hasSelection = selection.length > 0;

  let text;
  if (hasSelection) {
    text = selection;
  } else {
    text = editor.getValue();
  }

  const indent = " ".repeat(indentSize);
  const lines = text.split("\n");
  const indentedLines = lines.map((line) => {
    if (line.trim().length === 0) return line;
    // 既存のインデントを削除してから新しいインデントを追加
    return indent + line.trimStart();
  });

  const indented = indentedLines.join("\n");

  if (hasSelection) {
    editor.replaceSelection(indented);
  } else {
    editor.setValue(indented);
  }
}

// 統計情報の更新
function updateStats() {
  const content = editor.getValue();
  const lines = content.split("\n");
  const lineCount = lines.length;
  const charCount = content.length;

  lineCountSpan.textContent = `行: ${lineCount}`;
  charCountSpan.textContent = `文字: ${charCount}`;
}

// 選択範囲情報の更新
function updateSelectionInfo() {
  const selection = editor.getSelection();
  if (selection.length > 0) {
    const lines = selection.split("\n").length;
    selectionInfoSpan.textContent = `選択: ${selection.length}文字 (${lines}行)`;
  } else {
    const cursor = editor.getCursor();
    selectionInfoSpan.textContent = `位置: ${cursor.line + 1}行 ${
      cursor.ch + 1
    }列`;
  }
}
