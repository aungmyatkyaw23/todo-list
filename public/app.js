import Router from "/router.js";

const state = {
  user: null,
  editingId: null,
  filters: { q: "", status: "ALL", priority: "ALL", category: "ALL" },
  reset: { email: "", otp: "" }
};

let router;
let searchTimer;

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });

  if (response.status === 204) return null;

  let payload = {};
  try {
    payload = await response.json();
  } catch (_error) {
    // Non-JSON responses use the generic message below.
  }

  if (!response.ok) {
    const message = payload.error ? Object.values(payload.error).join(" ") : payload.message || "Request failed.";
    throw new Error(message);
  }

  return payload;
}

function setMessage(element, message, type = "info") {
  if (!element) return;
  element.textContent = message;
  element.dataset.type = type;
}

/**
 * Custom confirmation dialog using the <dialog> element.
 */
function showConfirm(title, message, confirmText = "Confirm") {
  const dialog = document.querySelector("#confirmDialog");
  const titleEl = dialog.querySelector("#confirmTitle");
  const messageEl = dialog.querySelector("#confirmMessage");
  const confirmBtn = dialog.querySelector("#confirmBtn");
  const cancelBtn = dialog.querySelector("#cancelBtn");

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText;

  return new Promise((resolve) => {
    const handleConfirm = () => {
      cleanup();
      resolve(true);
      dialog.close();
    };
    const handleCancel = () => {
      cleanup();
      resolve(false);
      dialog.close();
    };
    const cleanup = () => {
      confirmBtn.removeEventListener("click", handleConfirm);
      cancelBtn.removeEventListener("click", handleCancel);
    };

    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", handleCancel);
    dialog.showModal();
  });
}

function updateNav(path) {
  document.querySelectorAll("[data-route]").forEach((link) => {
    const isActive = link.getAttribute("href") === path;
    link.classList.toggle("active", isActive);
    
    // Add class to parent LI for mobile filtering
    const listItem = link.parentElement;
    if (listItem.tagName === 'LI') {
      listItem.classList.toggle("is-active", isActive);
    }
    
    // Update mobile active page label
    if (isActive) {
      const label = document.querySelector("#activePageLabel");
      if (label) label.textContent = link.textContent;
    }
  });
}

function formatDate(value) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function authMode(content, mode, message = "") {
  content.querySelectorAll("[data-auth-panel]").forEach((panel) => {
    if (panel.dataset.authPanel === mode) {
      panel.classList.remove("hidden");
    } else {
      panel.classList.add("hidden");
    }
  });
  // Changed logic to ensure tab buttons are always visible
  content.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === mode);
  });
  setMessage(content.querySelector("#authMessage"), message);
}

function bindAuth(content) {
  // Set the default auth mode to "login"
  authMode(content, "login", "Sign in to continue.");

  // Remove any existing event listeners to prevent duplication
  content.removeEventListener("click", handleAuthModeClick);
  content.removeEventListener("submit", handleAuthFormSubmit);

  // Define the event handlers as function declarations
  function handleAuthModeClick(event) {
    const modeButton = event.target.closest("[data-auth-mode]");
    if (modeButton) authMode(content, modeButton.dataset.authMode, "");
  }

  async function handleAuthFormSubmit(event) {
    const form = event.target;
    if (!form.matches("form")) return;
    event.preventDefault(); // Prevent default form submission

    const authMessage = content.querySelector("#authMessage");

    try {
      if (form.id === "loginForm" || form.id === "registerForm") {
        const registering = form.id === "registerForm";
        const payload = registering
          ? { name: form.name.value.trim(), email: form.email.value.trim(), password: form.password.value }
          : { email: form.email.value.trim(), password: form.password.value };

        // Call the login or register API
        const result = await request(`/api/auth/${registering ? "register" : "login"}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        // Update the state and navigate to the dashboard
        state.user = result.user;
        document.querySelector(".authStatus").textContent = "Logout";
        await router.navigate("/dashboard");
        return;
      }

      // Handle other forms (forgot password, verify, reset password)...
    } catch (error) {
      setMessage(authMessage, error.message, "error");
    }
  }

  // Add the event listeners
  content.addEventListener("click", handleAuthModeClick);
  content.addEventListener("submit", handleAuthFormSubmit);
}

function dashboardElements(content) {
  return {
    form: content.querySelector("#todoForm"),
    list: content.querySelector("#todoList"),
    status: content.querySelector("#statusMessage"),
    total: content.querySelector("#totalCount"),
    pending: content.querySelector("#pendingCount"),
    done: content.querySelector("#doneCount"),
    userName: content.querySelector("#currentUserName"),
    userEmail: content.querySelector("#currentUserEmail"),
    title: content.querySelector("#formTitle"),
    submit: content.querySelector("#submitBtn"),
    cancelEdit: content.querySelector("#cancelEditBtn"),
    search: content.querySelector("#searchInput"),
    statusFilter: content.querySelector("#statusFilter"),
    priorityFilter: content.querySelector("#priorityFilter"),
    categoryFilter: content.querySelector("#categoryFilter")
  };
}

function resetTodoForm(elements) {
  state.editingId = null;
  elements.form.reset();
  elements.form.priority.value = "MEDIUM";
  elements.form.category.value = "PERSONAL";
  elements.title.textContent = "Add a new task";
  elements.submit.textContent = "Save task";
  elements.cancelEdit.classList.add("hidden");
}

function renderTodos(elements, todos) {
  elements.total.textContent = todos.length;
  elements.pending.textContent = todos.filter((todo) => todo.status === "PENDING").length;
  elements.done.textContent = todos.filter((todo) => todo.status === "DONE").length;
  elements.list.innerHTML = "";

  if (!todos.length) {
    elements.list.innerHTML = '<div class="empty-state"><p>No tasks match this view yet. Add one above to get started.</p></div>';
    return;
  }

  const template = elements.list.closest("#content").querySelector("#todoCardTemplate");
  todos.forEach((todo) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".todo-card");
    fragment.querySelector(".todo-title").textContent = todo.title;
    fragment.querySelector(".todo-description").textContent = todo.description || "No description added.";
    fragment.querySelector(".todo-priority").textContent = `${todo.priority} priority`;
    fragment.querySelector(".todo-status").textContent = todo.status === "DONE" ? "Completed" : "Pending";
    fragment.querySelector(".todo-date").textContent = `Due ${formatDate(todo.dueDate)}`;
    const toggle = fragment.querySelector(".todo-toggle");
    toggle.checked = todo.status === "DONE";
    card.classList.add(`priority-${todo.priority.toLowerCase()}`);
    if (todo.status === "DONE") card.classList.add("done");

    toggle.addEventListener("change", async () => {
      try {
        await request(`/api/todos/${todo._id}/toggle`, { method: "PATCH" });
        await loadTodos(elements);
      } catch (error) {
        setMessage(elements.status, error.message, "error");
      }
    });

    fragment.querySelector(".edit-btn").addEventListener("click", () => {
      elements.form.title.value = todo.title;
      elements.form.description.value = todo.description || "";
      elements.form.priority.value = todo.priority;
      elements.form.category.value = todo.category;
      elements.form.dueDate.value = todo.dueDate ? todo.dueDate.slice(0, 10) : "";
      state.editingId = todo._id;
      elements.title.textContent = "Edit task";
      elements.submit.textContent = "Update task";
      elements.cancelEdit.classList.remove("hidden");
      elements.form.title.focus();
    });

    fragment.querySelector(".delete-btn").addEventListener("click", async () => {
      const confirmed = await showConfirm("Delete task?", `Delete “${todo.title}” ?`, "Delete");
      if (!confirmed) return;
      try {
        await request(`/api/todos/${todo._id}`, { method: "DELETE" });
        if (state.editingId === todo._id) resetTodoForm(elements);
        await loadTodos(elements);
      } catch (error) {
        setMessage(elements.status, error.message, "error");
      }
    });

    elements.list.appendChild(fragment);
  });
}

async function loadTodos(elements) {
  const params = new URLSearchParams();
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value && value !== "ALL") params.set(key, value);
  });
  setMessage(elements.status, "Loading tasks…");

  try {
    const todos = await request(`/api/todos?${params}`);
    if (!document.body.contains(elements.list)) return;
    renderTodos(elements, todos);
    setMessage(elements.status, `Showing ${todos.length} task${todos.length === 1 ? "" : "s"}.`);
  } catch (error) {
    if (error.message === "Please log in to continue.") {
      state.user = null;
      router.navigate("/auth", { replace: true });
      return;
    }
    setMessage(elements.status, error.message, "error");
  }
}

function weatherSummary(code) {
  const conditions = {
    0: ["☀️", "Clear sky"],
    1: ["🌤️", "Mostly clear"],
    2: ["⛅", "Partly cloudy"],
    3: ["☁️", "Overcast"],
    45: ["🌫️", "Foggy"],
    48: ["🌫️", "Rime fog"],
    51: ["🌦️", "Light drizzle"],
    53: ["🌦️", "Drizzle"],
    55: ["🌧️", "Heavy drizzle"],
    61: ["🌦️", "Light rain"],
    63: ["🌧️", "Rain"],
    65: ["🌧️", "Heavy rain"],
    71: ["🌨️", "Light snow"],
    73: ["🌨️", "Snow"],
    75: ["❄️", "Heavy snow"],
    80: ["🌦️", "Rain showers"],
    81: ["🌧️", "Rain showers"],
    82: ["⛈️", "Heavy showers"],
    95: ["⛈️", "Thunderstorm"]
  };
  return conditions[code] || ["✨", "Current conditions"];
}

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is unavailable in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => reject(new Error("Allow location access to see local weather.")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

async function updateWeather(content) {
  const info = content.querySelector("#weatherInfo");
  const description = content.querySelector("#weatherDescription");
  const refreshButton = content.querySelector("#refreshWeatherBtn");
  if (!info || !description) return;

  setMessage(info, "Loading local weather…");
  description.textContent = "";
  if (refreshButton) refreshButton.disabled = true;

  try {
    const { latitude, longitude } = await getCurrentLocation();
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "temperature_2m,apparent_temperature,weather_code"
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error("Weather service is unavailable.");
    const { current } = await response.json();
    const [icon, label] = weatherSummary(current.weather_code);

    setMessage(info, `${Math.round(current.temperature_2m)}°C · feels like ${Math.round(current.apparent_temperature)}°C`);
    description.textContent = `${icon} ${label}`;
  } catch (error) {
    setMessage(info, error.message, "error");
  } finally {
    if (refreshButton) refreshButton.disabled = false;
  }
}

function bindDashboard(content) {
  const elements = dashboardElements(content);
  elements.userName.textContent = state.user.name;
  elements.userEmail.textContent = state.user.email;
  resetTodoForm(elements);

  content.querySelector("#logoutBtn").addEventListener("click", async () => {
    const confirmed = await showConfirm("Logout?", "Are you sure you want to log out?", "Log out");
    if (!confirmed) return;
    try { await request("/api/auth/logout", { method: "POST" }); } catch (_error) {}
    state.user = null;
    state.editingId = null;
    document.querySelector(".authStatus").textContent = "Login";
    router.navigate("/auth");
  });

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      title: elements.form.title.value.trim(),
      description: elements.form.description.value.trim(),
      priority: elements.form.priority.value,
      category: elements.form.category.value,
      dueDate: elements.form.dueDate.value || null
    };
    const editing = Boolean(state.editingId);
    try {
      await request(editing ? `/api/todos/${state.editingId}` : "/api/todos", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      resetTodoForm(elements);
      await loadTodos(elements);
      setMessage(elements.status, editing ? "Task updated." : "Task saved.");
    } catch (error) {
      setMessage(elements.status, error.message, "error");
    }
  });

  elements.cancelEdit.addEventListener("click", () => resetTodoForm(elements));

  // Toggle filter section on mobile
  content.querySelector("#toggleFiltersBtn").addEventListener("click", () => {
    const filterContent = content.querySelector("#filterContent");
    filterContent.style.display = filterContent.style.display === "none" ? "block" : "none";
  });

  elements.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.filters.q = elements.search.value.trim();
      loadTodos(elements);
    }, 250);
  });
  [[elements.statusFilter, "status"], [elements.priorityFilter, "priority"], [elements.categoryFilter, "category"]].forEach(([input, key]) => {
    input.addEventListener("change", () => {
      state.filters[key] = input.value;
      loadTodos(elements);
    });
  });
  content.querySelector("#cancelFilterBtn").addEventListener("click", () => {
    state.filters = { q: "", status: "ALL", priority: "ALL", category: "ALL" };
    elements.search.value = "";
    elements.statusFilter.value = "ALL";
    elements.priorityFilter.value = "ALL";
    elements.categoryFilter.value = "ALL";
    loadTodos(elements);
  });

  content.querySelector("#refreshWeatherBtn").addEventListener("click", () => updateWeather(content));
  updateWeather(content);
  loadTodos(elements);
}

// function bindGame(content) {
//   const squares = [...content.querySelectorAll(".square")];
//   const message = content.querySelector("#gameMessage");
//   const wins = [[0, 1, 2], [0, 3, 6], [0, 4, 8], [1, 4, 7], [2, 4, 6], [2, 5, 8], [3, 4, 5], [6, 7, 8]];
//   let player = "X";
//   let completed = false;
//   const update = () => { message.textContent = `${player}'s turn`; };
//   const reset = () => {
//     completed = false;
//     player = "X";
//     squares.forEach((square) => { square.textContent = ""; square.disabled = false; });
//     update();
//   };
//   squares.forEach((square, index) => square.addEventListener("click", () => {
//     if (completed || square.textContent) return;
//     square.textContent = player;
//     const won = wins.some((line) => line.every((i) => squares[i].textContent === player));
//     if (won) {
//       completed = true;
//       message.textContent = `${player} wins!`;
//       return;
//     }
//     if (squares.every((item) => item.textContent)) {
//       completed = true;
//       message.textContent = "It's a draw!";
//       return;
//     }
//     player = player === "X" ? "O" : "X";
//     update();
//   }));
//   content.querySelector("#restartButton").addEventListener("click", reset);
//   reset();
// }

async function afterRender({ path, content }) {
  updateNav(path);
  if (path === "/auth") bindAuth(content);
  if (path === "/dashboard") bindDashboard(content);
  // if (path === "/game") bindGame(content);
}

async function loadSession() {
  try {
    state.user = (await request("/api/auth/me")).user;
  } catch (_error) {
    state.user = null;
  }
}

function bindNavigationMenu() {
  const logoutNav = document.querySelector("#logoutNav");
  if (state.user) {
    logoutNav.textContent = "Log out";
  }
  const button = document.querySelector(".hamburger");
  const links = document.querySelector(".nav-links");
  button.addEventListener("click", () => {
    const open = links.classList.toggle("active");
    button.setAttribute("aria-expanded", String(open));
  });

  if (logoutNav) {
    logoutNav.addEventListener("click", async (event) => {
      if (state.user) {
        event.preventDefault();
        event.stopPropagation();
        const confirmed = await showConfirm("Logout?", "Are you sure you want to log out?", "Log out");
        if (!confirmed) return;
        try {
          await request("/api/auth/logout", { method: "POST" });
        } catch (_error) {}
        state.user = null;
        state.editingId = null;
        logoutNav.textContent = "Login";
        router.navigate("/auth");
      }
    });
  }
}

await loadSession();
router = new Router({ isAuthenticated: () => Boolean(state.user), afterRender });
router
  .addRoute("/", "/views/home.html")
  .addRoute("/about", "/views/about.html")
  .addRoute("/auth", "/views/auth.html")
  .addRoute("/dashboard", "/views/dashboard.html", { protected: true })
bindNavigationMenu();
document.querySelector("#currentYear").textContent = new Date().getFullYear();
router.init();