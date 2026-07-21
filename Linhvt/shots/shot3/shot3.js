// 1. CẤU HÌNH MÀU SẮC & DANH SÁCH TRẠNG THÁI
const COLORS_V37 = { 
    "OPEN": "#fef08a", "PROCESS": "#86efac", "DEPLOY": "#bae6fd", 
    "DONE": "#67e8f9", "REJECT": "#fca5a5", "CLOSE": "#e2e8f0", 
    "PENDING": "#fecaca", "PILOT": "#fed7aa", "REOPEN": "#ffedd5" 
};
const STATUS_OPTS = ["OPEN", "PROCESS", "DEPLOY", "DONE", "REJECT", "CLOSE", "PENDING", "PILOT", "REOPEN"];

// LINK APPS SCRIPT CỦA BẠN
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwrRwwu2d7czYwQKr8lsL16sJgbPTLs-13tfTCevdZ4B7ITPgp-ZYD7s3sZ79UHadYI/exec";

window.ganttInit = async function() {
    window.gMonthOff = 0; // Biến lùi tới tháng
    try {
        const res = await fetch(`${GAS_API_URL}?t=${Date.now()}`);
        const raw = await res.json();
        
        // Phân loại dữ liệu dựa trên ID cột A và B
        window.gData = raw.map(r => {
            let type = 'project';
            if (r[0] && r[0].toString().trim() !== "") type = 'detail';
            else if (r[1] && r[1].toString().trim() !== "") type = 'task';
            
            return { 
                detail: r[0], task: r[1], id: r[2], desc: r[3], pic: r[4], 
                from: r[5], to: r[6], status: (r[7]||"Open").toUpperCase(), 
                project: r[8], group: r[9], team: r[10], type: type 
            };
        });
        renderGanttV37();
    } catch (e) { console.error("Lỗi nạp dữ liệu:", e); }

    // Sự kiện nút thêm Project mới
    document.getElementById('btnAddG').onclick = () => {
        const newId = "P" + (window.gData.filter(x => x.type === 'project').length + 1);
        window.gData.push({ 
            id: newId, task:"", detail:"", desc: "Dự án mới", pic: "Linh", 
            from: "2026-08-01", to: "2026-08-10", status: "OPEN", 
            type:"project", project: "Unilever", group: "Group 1", team: "Ms Giang" 
        });
        renderGanttV37();
    };

    // Sự kiện nút Sync
    document.getElementById('btnSyncG').onclick = () => syncGanttV37();
};
// 2. HÀM ĐỒNG BỘ CHIỀU CAO HÀNG (Fix lệch khi xuống dòng)
function syncRowHeights() {
    const leftRows = document.querySelectorAll('#bodyLeft tr');
    const rightRows = document.querySelectorAll('#bodyRight tr');
    leftRows.forEach((row, i) => {
        if (rightRows[i]) {
            leftRows[i].style.height = 'auto'; 
            rightRows[i].style.height = 'auto';
            const maxH = Math.max(row.offsetHeight, rightRows[i].offsetHeight);
            leftRows[i].style.height = maxH + 'px'; 
            rightRows[i].style.height = maxH + 'px';
        }
    });
}

// 3. HÀM RENDER CHÍNH (Đã fix tên hàm onclick)
function renderGanttV37() {
    const bL = document.getElementById('bodyLeft'), bR = document.getElementById('bodyRight'), hR = document.getElementById('headRight');
    if (!bL || !bR) return;

    const today = new Date();
    const startM = new Date(today.getFullYear(), today.getMonth() + window.gMonthOff, 1);
    const endM = new Date(startM.getFullYear(), startM.getMonth() + 1, 0);
    const days = endM.getDate(); 
    startM.setHours(0,0,0,0);
    
    document.getElementById('txtMonth').innerText = `THÁNG ${startM.getMonth()+1} / ${startM.getFullYear()}`;

    hR.innerHTML = `<tr><th colspan="${days}" class="gt-super-head">TIMELINE GANTT CHART (18px/Day)</th></tr><tr>` + 
                   Array.from({length: days}, (_, i) => `<th class="day-col">${i+1}</th>`).join('') + `</tr>`;

    const fP = document.getElementById('fP').checked, fT = document.getElementById('fT').checked, fD = document.getElementById('fD').checked;
    
    let htmlL = "", htmlR = "";

    window.gData.forEach((item, idx) => {
        if ((item.type==='project' && !fP) || (item.type==='task' && !fT) || (item.type==='detail' && !fD)) return;
        
        const indent = item.type==='task' ? 'ind-1' : (item.type==='detail' ? 'ind-2' : '');
        
        // FIX: Tên hàm gọi trong HTML phải khớp với window.addT37/addD37
        const btnT = (item.type === 'project') 
            ? `<button onclick="window.addT37('${item.id}')" class="btn-plus">+T</button>` 
            : (item.task || '');

        const btnD = (item.type === 'task') 
            ? `<button onclick="window.addD37('${item.task}')" class="btn-plus" style="background:#8b5cf6">+D</button>` 
            : (item.detail || '');
        
        let selectHtml = `<select class="status-select" style="background:${COLORS_V37[item.status]||'#eee'}" onchange="window.upSt37(${idx},this.value)">`;
        STATUS_OPTS.forEach(s => {
            selectHtml += `<option value="${s}" ${s===item.status?'selected':''}>${s}</option>`;
        });
        selectHtml += `</select>`;

        htmlL += `<tr>
            <td style="text-align:center">${btnD}</td>
            <td style="text-align:center">${btnT}</td>
            <td style="text-align:center; font-weight:700">${item.id}</td>
            <td contenteditable="true" onblur="window.upV37(${idx},'desc',this)" class="${indent}">${item.desc}</td>
            <td contenteditable="true" onblur="window.upV37(${idx},'pic',this)">${item.pic || ''}</td>
            <td contenteditable="true" onblur="window.upV37(${idx},'from',this)" style="text-align:center">${fixV37(item.from)}</td>
            <td contenteditable="true" onblur="window.upV37(${idx},'to',this)" style="text-align:center">${fixV37(item.to)}</td>
            <td>${selectHtml}</td>
            <td contenteditable="true" onblur="window.upV37(${idx},'project',this)">${item.project || ''}</td>
            <td contenteditable="true" onblur="window.upV37(${idx},'group',this)">${item.group || ''}</td>
            <td contenteditable="true" onblur="window.upV37(${idx},'team',this)">${item.team || ''}</td>
        </tr>`;

        const dS = new Date(fixV37(item.from)); const dE = new Date(fixV37(item.to));
        dS.setHours(0,0,0,0); dE.setHours(0,0,0,0);
        const clipS = dS < startM ? startM : dS; const clipE = dE > endM ? endM : dE;
        let sIdx = -1, dur = 0;
        if (clipS <= clipE && clipE >= startM && clipS <= endM) {
            sIdx = Math.floor((clipS - startM) / 86400000);
            dur = Math.floor((clipE - clipS) / 86400000) + 1;
        }

        let cells = "";
        for(let i=0; i<days; i++) {
            let bar = (i === sIdx) ? `<div class="gt-bar" style="background:${COLORS_V37[item.status]||'#cbd5e1'}; width:${dur*18-2}px"></div>` : "";
            cells += `<td class="day-col gt-cell-rel">${bar}</td>`;
        }
        htmlR += `<tr>${cells}</tr>`;
    });

    bL.innerHTML = htmlL; bR.innerHTML = htmlR;
    setTimeout(syncRowHeights, 50);
}


// 4. CÁC HÀM XỬ LÝ DỮ LIỆU (FIX TÊN HÀM)
window.changeMonthV37 = (n) => { window.gMonthOff += n; renderGanttV37(); };
window.upV37 = (i, f, el) => { window.gData[i][f] = el.innerText.trim(); if(['from','to'].includes(f)) renderGanttV37(); };
window.upSt37 = (i, v) => { window.gData[i].status = v; renderGanttV37(); };

function fixV37(s) { 
    if(!s) return ""; 
    let c = String(s).split('T')[0]; 
    let d = new Date(c); 
    return isNaN(d.getTime()) ? s : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; 
}
// --- THÊM TASK MỚI (Fix logic đếm & chèn) ---
window.addT37 = (pid) => {
    const parentPrj = window.gData.find(x => x.id === pid && x.type === 'project');
    if (!parentPrj) return alert("Không tìm thấy Project!");

    const currentTasks = window.gData.filter(x => x.id === pid && String(x.task || "").includes("_T"));
    const newTaskId = `${pid}_T${currentTasks.length + 1}`;
    const lastIdx = window.gData.findLastIndex(x => x.id === pid);

    window.gData.splice(lastIdx + 1, 0, { ...parentPrj, type: 'task', task: newTaskId, detail: "", desc: "Task mới" });
    renderGanttV37(); // Gọi đúng tên hàm
};

// --- THÊM DETAIL MỚI (Fix logic đếm & chèn) ---
window.addD37 = (tid) => {
    const parentTask = window.gData.find(x => x.task === tid && x.type === 'task');
    if (!parentTask) return alert("Không tìm thấy Task!");

    const currentDetails = window.gData.filter(x => x.task === tid && String(x.detail || "").includes("_D"));
    const newDetailId = `${tid}_D${currentDetails.length + 1}`;
    const lastIdx = window.gData.findLastIndex(x => x.task === tid);

    window.gData.splice(lastIdx + 1, 0, { ...parentTask, type: 'detail', detail: newDetailId, desc: "Detail mới" });
    renderGanttV37(); // Gọi đúng tên hàm
};

async function syncGanttV37() {
    const p = prompt("Mật khẩu: (LINHVTsync):"); 
    if (p !== "LINHVTsync") return alert("Sai mật khẩu!");
    
    const btn = document.getElementById('btnSyncG'); 
    btn.innerText = "⏳ Syncing...";
    btn.disabled = true;

    // ĐÓNG GÓI DỮ LIỆU VỚI TÊN BIẾN KHỚP 100% VỚI APPS SCRIPT
    const cleanPayload = window.gData.map(d => ({
        detail: String(d.detail || ""),
        task: String(d.task || ""),
        id: String(d.id || ""),
        desc: String(d.desc || ""),
        pic: String(d.pic || ""),
        from: fixV37(d.from),
        to: fixV37(d.to),
        status: String(d.status || "OPEN"),
        project: String(d.project || ""),
        group: String(d.group || ""),
        team: String(d.team || "")
    }));

    try {
        await fetch(GAS_API_URL, { 
            method: "POST", 
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ type: "UPDATE_ALL", data: cleanPayload }) 
        });

        alert("✅ ĐỒNG BỘ THÀNH CÔNG!");
    } catch (e) { 
        alert("❌ Lỗi kết nối!"); 
    } finally {
        btn.innerText = "Sync Google Sheets";
        btn.disabled = false;
    }
}

// Khởi chạy
window.ganttInit();