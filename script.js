let allStudents = [];
let allGroups = {};
let attendanceData = {};
let allDeadlines = []; // <-- NEW: Data store for deadlines
let selectedStudentRolls = new Set();
const MARKER_OPTIONS = ["✅", "❌"];
let undoState = null;
let undoTimeout = null;
let openGroups = new Set();

// --- DATA & CORE FUNCTIONS ---
function saveToStorage() {
  localStorage.setItem("students", JSON.stringify(allStudents));
  localStorage.setItem("groups", JSON.stringify(allGroups));
  localStorage.setItem("attendance", JSON.stringify(attendanceData));
  localStorage.setItem("deadlines", JSON.stringify(allDeadlines)); // <-- NEW
}
function loadFromStorage() {
  allStudents = JSON.parse(localStorage.getItem("students") || "[]");
  allGroups = JSON.parse(localStorage.getItem("groups") || "{}");
  attendanceData = JSON.parse(localStorage.getItem("attendance") || "{}");
  allDeadlines = JSON.parse(localStorage.getItem("deadlines") || "[]"); // <-- NEW
  Object.values(allGroups).forEach((group) => {
    group.forEach((member) => {
      if (member.marker === undefined) member.marker = "";
    });
  });
}
function refreshAll() {
  saveToStorage();
  renderStudents();
  renderGroups();
  updateAssignmentDropdown();
  updateAttendanceDropdown();
  renderDeadlines(); // <-- NEW
}

function clearUndoState() {
  clearTimeout(undoTimeout);
  undoState = null;
}
function showToast(message, undoCallback = null) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  const messageSpan = document.createElement("span");
  messageSpan.innerHTML = `<i class="fas fa-info-circle" style="margin-right: 10px;"></i> ${message}`;
  toast.appendChild(messageSpan);
  if (undoCallback) {
    const undoBtn = document.createElement("button");
    undoBtn.className = "undo-btn";
    undoBtn.textContent = "Undo";
    undoBtn.onclick = () => {
      undoCallback();
      toast.remove();
    };
    toast.appendChild(undoBtn);
  }
  container.appendChild(toast);
  const duration = undoCallback ? 7000 : 4000;
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, duration);
}
function performUndo() {
  if (!undoState) return;
  switch (undoState.type) {
    case "students":
      allStudents.push(...undoState.data.students);
      allStudents.sort((a, b) =>
        a.roll.localeCompare(b.roll, undefined, { numeric: true })
      );
      allGroups = undoState.data.groups;
      selectedStudentRolls.clear();
      break;
    case "group":
      allGroups[undoState.data.name] = undoState.data.members;
      break;
    case "members":
      const group = allGroups[undoState.data.groupName];
      if (group) {
        group.push(...undoState.data.members);
        group.sort((a, b) =>
          a.roll.localeCompare(b.roll, undefined, { numeric: true })
        );
      }
      break;
  }
  showToast("Action has been undone.");
  clearUndoState();
  refreshAll();
}

function renderStudents() {
  const container = document.getElementById("studentList");
  const query = document.getElementById("searchStudent").value.toLowerCase();
  const filteredStudents = allStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(query) ||
      s.roll.toLowerCase().includes(query)
  );
  if (filteredStudents.length === 0) {
    container.innerHTML =
      '<div class="text-center text-muted" style="padding-top: 20px;"><h3>No students found.</h3></div>';
    updateSelectedCount();
    return;
  }
  container.innerHTML = filteredStudents
    .map(
      (s, i) => `
      <div class="student-item ${
        selectedStudentRolls.has(s.roll) ? "selected" : ""
      }" onclick="toggleStudentSelection('${s.roll}')">
          <input type="checkbox" class="student-checkbox" data-roll="${
            s.roll
          }" onchange="handleStudentSelectionChange(event, '${s.roll}')" ${
        selectedStudentRolls.has(s.roll) ? "checked" : ""
      } onclick="event.stopPropagation()">
          <div class="student-serial">#${i + 1}</div>
          <div class="student-info">
              <div class="student-roll">${s.roll}</div>
              <div class="student-name">${s.name}</div>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editStudent('${
            s.roll
          }')"><i class="fas fa-edit"></i> Edit</button>
      </div>
  `
    )
    .join("");
  updateSelectedCount();
}

function renderGroups() {
  const container = document.getElementById("groupListContainer");
  const groupKeys = Object.keys(allGroups).sort();
  if (groupKeys.length === 0) {
    container.innerHTML =
      '<div class="text-center text-muted" style="padding-top: 20px;"><h3>No groups created.</h3></div>';
    return;
  }
  container.innerHTML = groupKeys
    .map((groupName) => {
      const members = allGroups[groupName];
      const isExpanded = openGroups.has(groupName);
      const selectedInGroup = members.filter((m) =>
        selectedStudentRolls.has(m.roll)
      );
      const memberHTML = members
        .map(
          (m, i) => `
          <div class="member-item ${
            selectedStudentRolls.has(m.roll) ? "selected" : ""
          }" onclick="toggleStudentSelection('${m.roll}')">
              <input type="checkbox" class="student-checkbox" data-roll="${
                m.roll
              }" onchange="handleStudentSelectionChange(event, '${m.roll}')" ${
            selectedStudentRolls.has(m.roll) ? "checked" : ""
          } onclick="event.stopPropagation()">
              <div class="student-serial">#${i + 1}</div>
              <div class="student-info">
                  <div class="student-roll">${m.roll}</div>
                  <div class="student-name">${m.name}</div>
              </div>
              <div class="marker-buttons">
                  ${MARKER_OPTIONS.map(
                    (marker) =>
                      `<button class="marker-btn ${
                        m.marker === marker ? "active" : ""
                      }" onclick="event.stopPropagation(); setMarker('${groupName}', '${
                        m.roll
                      }', '${marker}')">${marker}</button>`
                  ).join("")}
                  <button class="marker-btn marker-btn-clear" onclick="event.stopPropagation(); setMarker('${groupName}', '${
            m.roll
          }', '')" title="Clear marker">🗡</button>
              </div>
          </div>`
        )
        .join("");
      const moveOptionsHTML = Object.keys(allGroups)
        .filter((g) => g !== groupName)
        .map((g) => `<option value="${g}">${g}</option>`)
        .join("");
      return `
          <div class="group-card">
              <div class="group-header" onclick="toggleGroupBody('${groupName}')">
                  <div class="group-info">
                      <h3>${groupName}</h3>
                      <div class="group-stats">${
                        members.length
                      } members <span id="group-selected-count-${groupName}">(${
        selectedInGroup.length
      } selected)</span></div>
                  </div>
                  <div class="group-actions" onclick="event.stopPropagation()">
                      <button class="btn btn-sm btn-secondary" onclick="toggleSelectAllInGroup('${groupName}')"><i class="fas fa-check-square"></i> Select All</button>
                      <button class="btn btn-sm btn-primary" onclick="exportGroup('${groupName}')"><i class="fas fa-download"></i> Export</button>
                      <button class="btn btn-sm btn-danger" onclick="deleteGroup('${groupName}')"><i class="fas fa-trash"></i> Delete</button>
                  </div>
              </div>
              <div class="group-body ${isExpanded ? "expanded" : ""}">
                  <div class="action-bar" style="padding: 10px; margin-bottom: 10px; background: transparent;">
                      <button class="btn btn-danger" onclick="removeSelectedMembers('${groupName}')"><i class="fas fa-user-minus"></i> Remove Selected</button>
                      <select id="move-group-select-${groupName}" class="dropdown-select" ${
        moveOptionsHTML ? "" : "disabled"
      }> <option value="">Move selected to...</option> ${moveOptionsHTML} </select>
                      <button class="btn btn-success" onclick="moveSelectedMembers('${groupName}')" ${
        moveOptionsHTML ? "" : "disabled"
      }><i class="fas fa-people-arrows"></i> Move</button>
                  </div>
                  ${
                    members.length > 0
                      ? memberHTML
                      : '<div class="text-center text-muted">No members in this group.</div>'
                  }
              </div>
          </div>`;
    })
    .join("");
}

function showTab(tabId, element) {
  document
    .querySelectorAll(".tab-pane")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById(`${tabId}-tab`).classList.add("active");
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  element.classList.add("active");
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add("show");
}
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("show");
}
function openStudentModal() {
  document.getElementById("modalTitle").textContent = "Add New Student";
  document.getElementById("studentRoll").disabled = false;
  document.getElementById("studentRoll").value = "";
  document.getElementById("studentName").value = "";
  document.getElementById("editingRoll").value = "";
  openModal("studentModal");
}
function closeStudentModal() {
  closeModal("studentModal");
}
function openBulkAddModal() {
  openModal("bulkAddModal");
}
function closeBulkAddModal() {
  closeModal("bulkAddModal");
}
function openRandomizeModal() {
  openModal("randomizeModal");
}
function closeRandomizeModal() {
  closeModal("randomizeModal");
}
function saveStudent() {
  const roll = document.getElementById("studentRoll").value.trim();
  const name = document.getElementById("studentName").value.trim();
  const editingRoll = document.getElementById("editingRoll").value;
  if (!roll || !name)
    return showToast("Roll Number and Name are required.");
  if (editingRoll) {
    const student = allStudents.find((s) => s.roll === editingRoll);
    if (student) student.name = name;
    Object.values(allGroups).forEach((g) => {
      const m = g.find((m) => m.roll === editingRoll);
      if (m) m.name = name;
    });
    showToast("Student details updated.");
  } else {
    if (allStudents.some((s) => s.roll === roll))
      return showToast("Student with this Roll Number already exists.");
    allStudents.push({ roll, name });
    allStudents.sort((a, b) =>
      a.roll.localeCompare(b.roll, undefined, { numeric: true })
    );
    showToast("Student added successfully.");
  }
  refreshAll();
  closeStudentModal();
}
function importBulkStudents() {
  const data = document.getElementById("bulkStudentData").value.trim();
  if (!data) return showToast("Textarea is empty.");
  try {
    const newStudents = JSON.parse(data);
    if (!Array.isArray(newStudents))
      throw new Error("Input must be a JSON array.");
    let added = 0,
      skipped = 0;
    newStudents.forEach((s) => {
      if (
        s &&
        s.roll &&
        s.name &&
        !allStudents.some((es) => es.roll === s.roll.trim())
      ) {
        allStudents.push({ roll: s.roll.trim(), name: s.name.trim() });
        added++;
      } else {
        skipped++;
      }
    });
    if (added > 0)
      allStudents.sort((a, b) =>
        a.roll.localeCompare(b.roll, undefined, { numeric: true })
      );
    refreshAll();
    showToast(`Imported: ${added}, Skipped (duplicates): ${skipped}.`);
    closeBulkAddModal();
  } catch (error) {
    showToast(`Invalid JSON: ${error.message}`);
  }
}
function editStudent(roll) {
  const s = allStudents.find((st) => st.roll === roll);
  if (s) {
    document.getElementById("modalTitle").textContent = "Edit Student";
    document.getElementById("studentRoll").value = s.roll;
    document.getElementById("studentRoll").disabled = true;
    document.getElementById("studentName").value = s.name;
    document.getElementById("editingRoll").value = s.roll;
    openModal("studentModal");
  }
}
function deleteSelectedStudents() {
  if (selectedStudentRolls.size === 0)
    return showToast("No students selected.");
  if (
    !confirm(
      `Delete ${selectedStudentRolls.size} student(s)? This can be undone.`
    )
  )
    return;
  clearUndoState();
  const studentsToDelete = allStudents.filter((s) =>
    selectedStudentRolls.has(s.roll)
  );
  undoState = {
    type: "students",
    data: {
      students: studentsToDelete,
      groups: JSON.parse(JSON.stringify(allGroups)),
    },
  };
  allStudents = allStudents.filter(
    (s) => !selectedStudentRolls.has(s.roll)
  );
  Object.keys(allGroups).forEach((g) => {
    allGroups[g] = allGroups[g].filter(
      (m) => !selectedStudentRolls.has(m.roll)
    );
  });
  const count = selectedStudentRolls.size;
  selectedStudentRolls.clear();
  refreshAll();
  showToast(`${count} student(s) deleted.`, performUndo);
  undoTimeout = setTimeout(clearUndoState, 7000);
}
function toggleStudentSelection(roll) {
  handleStudentSelectionChange(null, roll);
}
function handleStudentSelectionChange(event, roll) {
  if (event) event.stopPropagation();
  const isChecked = selectedStudentRolls.has(roll);
  if (isChecked) selectedStudentRolls.delete(roll);
  else selectedStudentRolls.add(roll);
  updateSelectedCount();
  renderStudents();
  renderGroups();
}
function toggleSelectAllStudents() {
  const visibleStudents = allStudents.filter((s) => {
    const query = document
      .getElementById("searchStudent")
      .value.toLowerCase();
    return (
      s.name.toLowerCase().includes(query) ||
      s.roll.toLowerCase().includes(query)
    );
  });
  const allVisibleSelected = visibleStudents.every((s) =>
    selectedStudentRolls.has(s.roll)
  );
  visibleStudents.forEach((s) => {
    if (allVisibleSelected) selectedStudentRolls.delete(s.roll);
    else selectedStudentRolls.add(s.roll);
  });
  renderStudents();
}
function updateSelectedCount() {
  document.getElementById(
    "selectedCount"
  ).textContent = `(${selectedStudentRolls.size})`;
}
function exportSelectedStudents() {
  if (selectedStudentRolls.size === 0)
    return showToast("No students selected.");
  const text = Array.from(selectedStudentRolls)
    .map((roll) => {
      const s = allStudents.find((s) => s.roll === roll);
      return s ? `${s.roll} - ${s.name}` : "";
    })
    .join("\n");
  downloadFile("selected_students.txt", text);
}
function createGroup() {
  const name = document.getElementById("newGroupName").value.trim();
  if (!name) return showToast("Please enter a group name.");
  if (allGroups[name])
    return showToast("Group with this name already exists.");
  allGroups[name] = [];
  refreshAll();
  showToast(`Group "${name}" created.`);
  document.getElementById("newGroupName").value = "";
}
function assignSelectedToGroup() {
  const groupName = document.getElementById("groupSelect").value;
  if (!groupName) return showToast("Please select a group.");
  if (selectedStudentRolls.size === 0)
    return showToast("No students selected.");
  let assigned = 0;
  selectedStudentRolls.forEach((roll) => {
    if (!allGroups[groupName].some((m) => m.roll === roll)) {
      const s = allStudents.find((s) => s.roll === roll);
      if (s) {
        allGroups[groupName].push({ ...s, marker: "" });
        assigned++;
      }
    }
  });
  if (assigned > 0) {
    allGroups[groupName].sort((a, b) =>
      a.roll.localeCompare(b.roll, undefined, { numeric: true })
    );
    showToast(`${assigned} student(s) assigned to "${groupName}".`);
  } else {
    showToast(`Selected students already in "${groupName}".`);
  }
  selectedStudentRolls.clear();
  refreshAll();
}
function setMarker(groupName, roll, marker) {
  const member = allGroups[groupName]?.find((m) => m.roll === roll);
  if (member) {
    member.marker = member.marker === marker ? "" : marker;
    refreshAll();
    showToast("Marker updated.");
  }
}
function removeMember(groupName, roll) {
  if (!confirm(`Remove student from "${groupName}"? This can be undone.`))
    return;
  clearUndoState();
  const memberToRemove = allGroups[groupName].find(
    (m) => m.roll === roll
  );
  if (memberToRemove) {
    undoState = {
      type: "members",
      data: { groupName: groupName, members: [memberToRemove] },
    };
    allGroups[groupName] = allGroups[groupName].filter(
      (m) => m.roll !== roll
    );
    refreshAll();
    showToast(`Removed student from "${groupName}".`, performUndo);
    undoTimeout = setTimeout(clearUndoState, 7000);
  }
}
function removeSelectedMembers(groupName) {
  const rolls = allGroups[groupName]
    .filter((m) => selectedStudentRolls.has(m.roll))
    .map((m) => m.roll);
  if (rolls.length === 0)
    return showToast("No members selected to remove.", "warning");
  if (
    !confirm(
      `Remove ${rolls.length} member(s) from "${groupName}"? This can be undone.`
    )
  )
    return;
  clearUndoState();
  const membersToRemove = allGroups[groupName].filter((m) =>
    rolls.includes(m.roll)
  );
  undoState = {
    type: "members",
    data: { groupName: groupName, members: membersToRemove },
  };
  allGroups[groupName] = allGroups[groupName].filter(
    (m) => !rolls.includes(m.roll)
  );
  rolls.forEach((r) => selectedStudentRolls.delete(r));
  refreshAll();
  showToast(
    `${rolls.length} member(s) removed from "${groupName}".`,
    performUndo
  );
  undoTimeout = setTimeout(clearUndoState, 7000);
}
function moveSelectedMembers(groupName) {
  const targetGroupName = document.getElementById(
    `move-group-select-${groupName}`
  ).value;
  if (!targetGroupName)
    return showToast("Please select a destination group.", "warning");
  const rollsToMove = allGroups[groupName]
    .filter((m) => selectedStudentRolls.has(m.roll))
    .map((m) => m.roll);
  if (rollsToMove.length === 0)
    return showToast("No members selected to move.", "warning");
  let movedCount = 0;
  rollsToMove.forEach((roll) => {
    if (!allGroups[targetGroupName].some((m) => m.roll === roll)) {
      const memberToMove = allGroups[groupName].find(
        (m) => m.roll === roll
      );
      if (memberToMove) {
        allGroups[targetGroupName].push(memberToMove);
        movedCount++;
      }
    }
  });
  allGroups[groupName] = allGroups[groupName].filter(
    (m) => !rollsToMove.includes(m.roll)
  );
  allGroups[targetGroupName].sort((a, b) =>
    a.roll.localeCompare(b.roll, undefined, { numeric: true })
  );
  rollsToMove.forEach((r) => selectedStudentRolls.delete(r));
  refreshAll();
  if (movedCount > 0)
    showToast(
      `${movedCount} member(s) moved to "${targetGroupName}".`,
      "success"
    );
  else
    showToast(
      "Selected members are already in the target group.",
      "warning"
    );
}
function toggleSelectAllInGroup(groupName) {
  const membersInGroup = allGroups[groupName];
  const memberRolls = membersInGroup.map((m) => m.roll);
  const allSelected = memberRolls.every((r) =>
    selectedStudentRolls.has(r)
  );
  if (allSelected) {
    memberRolls.forEach((r) => selectedStudentRolls.delete(r));
  } else {
    memberRolls.forEach((r) => selectedStudentRolls.add(r));
  }
  renderGroups();
}
function deleteGroup(groupName) {
  if (!confirm(`Delete the group "${groupName}"? This can be undone.`))
    return;
  clearUndoState();
  undoState = {
    type: "group",
    data: { name: groupName, members: [...allGroups[groupName]] },
  };
  openGroups.delete(groupName);
  delete allGroups[groupName];
  refreshAll();
  showToast(`Group "${groupName}" deleted.`, performUndo);
  undoTimeout = setTimeout(clearUndoState, 7000);
}
function exportGroup(groupName) {
  const members = allGroups[groupName];
  if (!members || members.length === 0)
    return showToast(`Group "${groupName}" is empty.`);
  const text = members
    .map(
      (m) => `${m.roll} - ${m.name}${m.marker ? ` [${m.marker}]` : ""}`
    )
    .join("\n");
  downloadFile(
    `${groupName}_members.txt`,
    `Members of Group: ${groupName}\n\n${text}`
  );
}
function toggleCollapse(elementId) {
  document.getElementById(elementId).classList.toggle("collapsed");
}
function toggleGroupBody(groupName) {
  if (openGroups.has(groupName)) openGroups.delete(groupName);
  else openGroups.add(groupName);
  renderGroups();
}
function toggleAllGroupBodies() {
  const groupKeys = Object.keys(allGroups);
  if (groupKeys.length === 0) return;
  const shouldOpen = openGroups.size < groupKeys.length;
  if (shouldOpen) {
    groupKeys.forEach((key) => openGroups.add(key));
  } else {
    openGroups.clear();
  }
  renderGroups();
}
function updateAssignmentDropdown() {
  const select = document.getElementById("groupSelect");
  select.innerHTML =
    `<option value="">Select a group...</option>` +
    Object.keys(allGroups)
      .sort()
      .map((g) => `<option value="${g}">${g}</option>`)
      .join("");
}
function updateRandomizeLabel() {
  const method = document.querySelector(
    'input[name="randomizeMethod"]:checked'
  ).value;
  document.getElementById("randomizeValueLabel").textContent =
    method === "numGroups" ? "Number of Groups:" : "Students per Group:";
}
function generateRandomGroups() {
  const method = document.querySelector(
    'input[name="randomizeMethod"]:checked'
  ).value;
  const value = parseInt(document.getElementById("randomizeValue").value);
  const includeAssigned =
    document.getElementById("includeAssigned").checked;
  if (!value || value < 1)
    return showToast("Please enter a valid number.");
  let studentPool = [];
  if (includeAssigned) {
    studentPool = [...allStudents];
  } else {
    const assignedRolls = new Set(
      Object.values(allGroups)
        .flat()
        .map((m) => m.roll)
    );
    studentPool = allStudents.filter((s) => !assignedRolls.has(s.roll));
  }
  if (studentPool.length === 0)
    return showToast("No available students to randomize.");
  for (let i = studentPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [studentPool[i], studentPool[j]] = [studentPool[j], studentPool[i]];
  }
  let groupCounter = 1;
  while (allGroups[`Random Group ${groupCounter}`]) {
    groupCounter++;
  }
  if (method === "numGroups") {
    if (value > studentPool.length)
      return showToast(
        "Number of groups cannot exceed available students."
      );
    for (let i = 0; i < value; i++) {
      allGroups[`Random Group ${groupCounter + i}`] = [];
    }
    studentPool.forEach((student, index) => {
      allGroups[`Random Group ${groupCounter + (index % value)}`].push({
        ...student,
        marker: "",
      });
    });
  } else {
    for (let i = 0; i < studentPool.length; i += value) {
      const groupName = `Random Group ${groupCounter++}`;
      allGroups[groupName] = studentPool
        .slice(i, i + value)
        .map((s) => ({ ...s, marker: "" }));
    }
  }
  refreshAll();
  showToast("Random groups generated successfully!");
  closeRandomizeModal();
}
function downloadFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function backupAllData() {
  const data = {
    students: allStudents,
    groups: allGroups,
    attendance: attendanceData,
  };
  downloadFile(
    `student_manager_backup_${
      new Date().toISOString().split("T")[0]
    }.json`,
    JSON.stringify(data, null, 2)
  );
  showToast("Full data backup created.");
}
function restoreData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (
        data &&
        Array.isArray(data.students) &&
        typeof data.groups === "object"
      ) {
        if (
          confirm(
            "Restore data? This will overwrite all current students and groups."
          )
        ) {
          allStudents = data.students || [];
          allGroups = data.groups || {};
          attendanceData = data.attendance || {};
          selectedStudentRolls.clear();
          openGroups.clear();
          refreshAll();
          showToast("Data restored successfully!");
        }
      } else {
        throw new Error("Invalid backup file format.");
      }
    } catch (error) {
      showToast(`Restore failed: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

// --- ATTENDANCE FUNCTIONS ---
function updateAttendanceDropdown() {
  const select = document.getElementById("attendanceGroupSelect");
  select.innerHTML =
    '<option value="">Select a group...</option>' +
    Object.keys(allGroups)
      .sort()
      .map((g) => `<option value="${g}">${g}</option>`)
      .join("");
  handleAttendanceGroupChange(); // Refresh view
}

function handleAttendanceGroupChange(forceRetake = false) {
  const groupName = document.getElementById(
    "attendanceGroupSelect"
  ).value;
  const placeholder = document.getElementById("attendance-placeholder");
  const takingContainer = document.getElementById(
    "attendance-taking-container"
  );
  const summaryContainer = document.getElementById(
    "attendance-summary-container"
  );

  if (!groupName) {
    placeholder.classList.remove("hidden");
    takingContainer.classList.add("hidden");
    summaryContainer.classList.add("hidden");
    return;
  }

  placeholder.classList.add("hidden");
  const today = new Date().toISOString().slice(0, 10);
  const todaysRecord = attendanceData[groupName]?.[today];

  if (todaysRecord && !forceRetake) {
    renderAttendanceSummary(groupName, today);
  } else {
    renderAttendanceTakingInterface(groupName);
  }
}

function renderAttendanceTakingInterface(
  groupName,
  existingRecord = null
) {
  document
    .getElementById("attendance-taking-container")
    .classList.remove("hidden");
  document
    .getElementById("attendance-summary-container")
    .classList.add("hidden");

  const members = allGroups[groupName] || [];
  const listContainer = document.getElementById("attendanceStudentList");

  if (members.length === 0) {
    listContainer.innerHTML =
      '<div class="text-center text-muted">This group has no members.</div>';
    document.getElementById("attendance-actions").classList.add("hidden");
    return;
  }

  document
    .getElementById("attendance-actions")
    .classList.remove("hidden");
  listContainer.innerHTML = members
    .map((member, i) => {
      const isPresent = existingRecord
        ? existingRecord.present.includes(member.roll)
        : false;

      return `
        <div class="attendance-item">
            <div class="student-serial">#${i + 1}</div>
            <div class="student-info">
                <div class="student-roll">${member.roll}</div>
                <div class="student-name">${member.name}</div>
            </div>
            <div class="attendance-options radio-group">
                <div class="radio-item">
                    <input type="radio" id="present-${
                      member.roll
                    }" name="attendance-${member.roll}" value="present" ${
        isPresent ? "checked" : ""
      }>
                    <label for="present-${member.roll}">Present</label>
                </div>
                <div class="radio-item">
                    <input type="radio" id="absent-${
                      member.roll
                    }" name="attendance-${member.roll}" value="absent" ${
        !isPresent ? "checked" : ""
      }>
                    <label for="absent-${member.roll}">Absent</label>
                </div>
            </div>
        </div>
    `;
    })
    .join("");
}

function saveAttendance() {
  const groupName = document.getElementById(
    "attendanceGroupSelect"
  ).value;
  if (!groupName) return;

  const members = allGroups[groupName] || [];
  const today = new Date().toISOString().slice(0, 10);

  if (!attendanceData[groupName]) {
    attendanceData[groupName] = {};
  }

  const record = { present: [], absent: [] };
  members.forEach((member) => {
    const statusInput = document.querySelector(
      `input[name="attendance-${member.roll}"]:checked`
    );
    if (statusInput) {
      const status = statusInput.value;
      record[status].push(member.roll);
    }
  });

  attendanceData[groupName][today] = record;
  saveToStorage();
  showToast(`Attendance saved for ${groupName}.`);
  renderAttendanceSummary(groupName, today);
}

function renderAttendanceSummary(groupName, date) {
  document
    .getElementById("attendance-taking-container")
    .classList.add("hidden");
  document
    .getElementById("attendance-summary-container")
    .classList.remove("hidden");

  const record = attendanceData[groupName]?.[date];
  if (!record) return;

  document.getElementById(
    "summaryTitle"
  ).textContent = `Attendance for ${groupName} on ${date}`;
  document.getElementById("presentCount").textContent =
    record.present.length;
  document.getElementById("absentCount").textContent =
    record.absent.length;

  const presentList = document.getElementById("presentStudentList");
  const absentList = document.getElementById("absentStudentList");
  const findStudent = (roll) => allStudents.find((s) => s.roll === roll);

  presentList.innerHTML =
    record.present
      .map((roll) => {
        const student = findStudent(roll);
        return `<li>${
          student ? `${student.roll} - ${student.name}` : roll
        }</li>`;
      })
      .join("") || "<li>None</li>";

  absentList.innerHTML =
    record.absent
      .map((roll) => {
        const student = findStudent(roll);
        return `<li>${
          student ? `${student.roll} - ${student.name}` : roll
        }</li>`;
      })
      .join("") || "<li>None</li>";
}

function editAttendance() {
  const groupName = document.getElementById(
    "attendanceGroupSelect"
  ).value;
  if (!groupName) return;
  const today = new Date().toISOString().slice(0, 10);
  const todaysRecord = attendanceData[groupName]?.[today];
  if (todaysRecord) {
    renderAttendanceTakingInterface(groupName, todaysRecord);
  } else {
    showToast("No record found for today to edit.");
  }
}

function retakeAttendance() {
  handleAttendanceGroupChange(true);
}

// --- DEADLINE MODAL FUNCTIONS ---
function openDeadlineModal(deadlineId = null) {
  const modalTitle = document.getElementById("deadlineModalTitle");
  const nameInput = document.getElementById("deadlineName");
  const dateInput = document.getElementById("deadlineDate");
  const groupSelect = document.getElementById("deadlineGroup");
  const notesInput = document.getElementById("deadlineNotes");
  const editingIdInput = document.getElementById("editingDeadlineId");

  groupSelect.innerHTML = `<option value="">None</option>`;
  groupSelect.innerHTML += Object.keys(allGroups)
    .sort()
    .map((g) => `<option value="${g}">${g}</option>`)
    .join("");

  if (deadlineId) {
    const deadline = allDeadlines.find((d) => d.id === deadlineId);
    if (deadline) {
      modalTitle.textContent = "Edit Deadline";
      nameInput.value = deadline.name;
      dateInput.value = deadline.date;
      groupSelect.value = deadline.groupId || "";
      notesInput.value = deadline.notes;
      editingIdInput.value = deadline.id;
    }
  } else {
    modalTitle.textContent = "Add New Deadline";
    nameInput.value = "";
    dateInput.value = "";
    groupSelect.value = "";
    notesInput.value = "";
    editingIdInput.value = "";
  }
  openModal("deadlineModal");
}

function closeDeadlineModal() {
  closeModal("deadlineModal");
}

function saveDeadline() {
  const name = document.getElementById("deadlineName").value.trim();
  const date = document.getElementById("deadlineDate").value;
  const groupId = document.getElementById("deadlineGroup").value;
  const notes = document.getElementById("deadlineNotes").value.trim();
  const editingId = document.getElementById("editingDeadlineId").value;

  if (!name || !date) {
    return showToast("Event Name and Due Date are required.");
  }

  if (editingId) {
    const deadline = allDeadlines.find((d) => d.id == editingId);
    if (deadline) {
      deadline.name = name;
      deadline.date = date;
      deadline.groupId = groupId;
      deadline.notes = notes;
    }
    showToast("Deadline updated successfully.");
  } else {
    const newDeadline = {
      id: Date.now(),
      name,
      date,
      groupId,
      notes,
    };
    allDeadlines.push(newDeadline);
    showToast("Deadline added successfully.");
  }

  refreshAll();
  closeDeadlineModal();
}

function deleteDeadline(deadlineId) {
  if (confirm("Are you sure you want to delete this deadline?")) {
    allDeadlines = allDeadlines.filter((d) => d.id !== deadlineId);
    refreshAll();
    showToast("Deadline deleted.");
  }
}

// --- DEADLINE RENDERING FUNCTIONS ---
function renderDeadlines() {
  const upcomingContainer = document.getElementById("upcomingDeadlinesList");
  const pastContainer = document.getElementById("pastDeadlinesList");

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = [];
  const past = [];

  allDeadlines.forEach((d) => {
    const [year, month, day] = d.date.split("-").map(Number);
    const deadlineDate = new Date(year, month - 1, day);

    if (deadlineDate < now) {
      past.push(d);
    } else {
      upcoming.push(d);
    }
  });

  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
  past.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (upcoming.length === 0) {
    upcomingContainer.innerHTML =
      '<div class="text-center text-muted" style="padding-top: 20px;"><h3>No upcoming deadlines. Great job!</h3></div>';
  } else {
    upcomingContainer.innerHTML = upcoming
      .map((d) => createDeadlineHTML(d))
      .join("");
  }

  if (past.length === 0) {
    pastContainer.innerHTML =
      '<div class="text-center text-muted" style="padding: 20px 0;">No past deadlines found.</div>';
  } else {
    pastContainer.innerHTML = past.map((d) => createDeadlineHTML(d)).join("");
  }
}

function createDeadlineHTML(deadline) {
  const { id, name, date, groupId, notes } = deadline;
  const groupName = allGroups[groupId] ? groupId : "None";
  const { text, className } = getTimeLeftInfo(date);

  const [year, month, day] = date.split("-");
  const displayDate = new Date(year, month - 1, day).toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return `
    <div class="deadline-item">
      <div class="deadline-header">
        <div class="deadline-info">
          <h3>${name}</h3>
          ${
            notes
              ? `<p class="deadline-notes">${notes.replace(/\n/g, "<br>")}</p>`
              : ""
          }
        </div>
        <div class="group-actions">
          <button class="btn btn-sm btn-secondary" onclick="openDeadlineModal(${id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteDeadline(${id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>
      <div class="deadline-meta">
        <div>
          <i class="fas fa-calendar-day"></i> Due: <strong>${displayDate}</strong>
          ${
            groupId
              ? `<br><i class="fas fa-layer-group"></i> Group: <strong>${groupName}</strong>`
              : ""
          }
        </div>
        <span class="time-badge ${className}">${text}</span>
      </div>
    </div>
  `;
}

function getTimeLeftInfo(dateString) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const [year, month, day] = dateString.split("-").map(Number);
  const deadlineDate = new Date(year, month - 1, day);

  const diffTime = deadlineDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `Overdue by ${Math.abs(diffDays)} day(s)`, className: "overdue" };
  }
  if (diffDays === 0) {
    return { text: "Due Today", className: "due-today" };
  }
  if (diffDays <= 7) {
    return { text: `Due in ${diffDays} day(s)`, className: "due-soon" };
  }
  return { text: `Due in ${diffDays} days`, className: "future" };
}

// --- ON LOAD ---
document.addEventListener("DOMContentLoaded", () => {
  // Load data or set initial sample data
  if (
    !localStorage.getItem("students") &&
    !localStorage.getItem("groups")
  ) {
    allStudents = [
      { roll: "1", name: "Abdul Kalam B" },
      { roll: "2", name: "Ajay D" },
      { roll: "3", name: "Akash Kumar R" },
      { roll: "4", name: "Arunachalam E" },
      { roll: "5", name: "Babu Esvaran C" },
      { roll: "6", name: "Daniel Raj R" },
    ];
    allGroups = {
      "Team Alpha": [
        { ...allStudents[0], marker: "" },
        { ...allStudents[1], marker: "" },
      ],
      "Team Beta": [{ ...allStudents[2], marker: "" }],
    };

    // Add sample deadline data
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    allDeadlines = [
      { id: 1, name: "Physics Assignment 1", date: nextWeek.toISOString().slice(0, 10), groupId: "Team Alpha", notes: "Chapters 1-3" },
      { id: 2, name: "Project Proposal Submission", date: today.toISOString().slice(0, 10), groupId: "", notes: "Submit via portal" }
    ];

    saveToStorage();
  }
  loadFromStorage();
  refreshAll();
  document
    .getElementById("searchStudent")
    .addEventListener("input", renderStudents);
});