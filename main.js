
let pyodide = null;

async function initialize() {
    const status = document.getElementById("status");
    const button = document.getElementById("run");

    status.textContent = "Pyodideを読み込み中...";

    pyodide = await loadPyodide();

    // Pyodideのパッケージローダーで依存関係を読み込む
    await pyodide.loadPackage([
        "numpy",
        "opencv-python",
        "micropip",
    ]);
    const micropip = pyodide.pyimport("micropip");
    await micropip.install('openpyxl');
    await micropip.install('./dist/pyodide_work-0.1.0-py3-none-any.whl');

    button.disabled = false;
    status.textContent = "準備完了";
}

async function processFile() {
    const fileInput = document.getElementById("image");
    const status = document.getElementById("status");
    const button = document.getElementById("run");

    const file = fileInput.files[0];

    if (!file) {
        status.textContent = "画像を選択してください";
        return;
    }

    button.disabled = true;

    try {
        status.textContent = "画像を処理中...";

        const bytes = new Uint8Array(await file.arrayBuffer());

        // JavaScriptのUint8ArrayをPythonのbytesに変換
        const pythonBytes = pyodide.toPy(bytes);
        let result = null;

        try {
            const processor = pyodide.pyimport("pyodide_work");
            result = processor.process_image(pythonBytes);
            // Python bytes -> JavaScript Uint8Array
            const excelBytes = result.toJs();

            const blob = new Blob(
                [excelBytes],
                {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = "result.xlsx";
            link.click();

            // ダウンロード開始後にURLを解放
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            status.textContent = "処理完了";
        } finally {
            result?.destroy();
            pythonBytes.destroy();
        }
    } catch (error) {
        console.error(error);
        status.textContent = `エラー: ${error.message}`;
    } finally {
        button.disabled = false;
    }
}

document.getElementById("run").addEventListener(
    "click",
    processFile
);

initialize().catch((error) => {
    console.error(error);
    document.getElementById("status").textContent =
        `初期化エラー: ${error.message}`;
});
