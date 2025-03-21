import { database, auth, ref, set, get, onValue, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail } from './firebase-config.js';

// Importar Bootstrap para el manejo de modales
import * as bootstrap from 'bootstrap';

let currentUser = null;
let events = [];
let goals = [];
let songs = [];

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar autenticación
    initializeAuth();
    // Inicializar contador
    initializeCounters();
    // Inicializar calendario
    initializeCalendar();
    // Inicializar metas
    initializeGoals();
    // Inicializar música
    initializeSongs();
});

function showLoadingState(loading) {
    const buttons = document.querySelectorAll('button[type="submit"]');
    buttons.forEach(button => {
        button.disabled = loading;
        if (loading) {
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cargando...';
        } else {
            button.innerHTML = button.getAttribute('data-original-text') || (button.closest('#loginForm') ? 'Iniciar Sesión' : 'Registrarse');
        }
    });
}

function initializeAuth() {
    const loginButton = document.getElementById('loginButton');
    const emailLoginButton = document.getElementById('emailLoginButton');
    const userEmail = document.getElementById('userEmail');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Guardar el texto original de los botones
    document.querySelectorAll('button[type="submit"]').forEach(button => {
        button.setAttribute('data-original-text', button.innerHTML);
    });

    loginButton.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account',
            login_hint: localStorage.getItem('lastLoginEmail') || ''
        });
        try {
            loginButton.disabled = true;
            const result = await signInWithPopup(auth, provider);
            currentUser = result.user;
            localStorage.setItem('lastLoginEmail', currentUser.email);
            loginButton.style.display = 'none';
            emailLoginButton.style.display = 'none';
            userEmail.textContent = currentUser.email;
            userEmail.style.display = 'inline';
            await loadUserData();
        } catch (error) {
            console.error('Error al iniciar sesión con Google:', error);
            loginButton.classList.remove('btn-outline-light');
            loginButton.classList.add('btn-danger');
            if (error.code === 'auth/popup-closed-by-user') {
                alert('La ventana de inicio de sesión fue cerrada. Por favor, intenta nuevamente.');
            } else if (error.code === 'auth/cancelled-popup-request') {
                // Ignorar este error ya que es normal cuando se cierra una solicitud anterior
            } else if (error.code === 'auth/network-request-failed') {
                alert('Error de conexión. Por favor, verifica tu conexión a internet.');
            } else if (error.code === 'auth/internal-error') {
                alert('Error interno del servidor. Por favor, intenta más tarde.');
            } else {
                alert('Error al iniciar sesión con Google. Por favor, intenta con correo electrónico.');
            }
            setTimeout(() => {
                loginButton.classList.remove('btn-danger');
                loginButton.classList.add('btn-outline-light');
            }, 3000);
        } finally {
            loginButton.disabled = false;
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        showLoadingState(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            currentUser = userCredential.user;
            localStorage.setItem('lastLoginEmail', currentUser.email);
            loginButton.style.display = 'none';
            emailLoginButton.style.display = 'none';
            userEmail.textContent = currentUser.email;
            userEmail.style.display = 'inline';
            bootstrap.Modal.getInstance(document.getElementById('emailLoginModal')).hide();
            await loadUserData();
        } catch (error) {
            console.error('Error al iniciar sesión con correo:', error);
            let errorMessage = 'Error al iniciar sesión. ';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage += 'Usuario no encontrado.';
                    break;
                case 'auth/wrong-password':
                    errorMessage += 'Contraseña incorrecta.';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Formato de correo electrónico inválido.';
                    break;
                default:
                    errorMessage += 'Por favor, verifica tu correo y contraseña.';
            }
            alert(errorMessage);
        } finally {
            showLoadingState(false);
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            // Verificar si el correo ya existe
            const signInMethods = await fetchSignInMethodsForEmail(auth, email);
            if (signInMethods.length > 0) {
                alert('Este correo electrónico ya está registrado. Por favor, inicia sesión o utiliza otro correo.');
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            currentUser = userCredential.user;
            localStorage.setItem('lastLoginEmail', currentUser.email);
            loginButton.style.display = 'none';
            emailLoginButton.style.display = 'none';
            userEmail.textContent = currentUser.email;
            userEmail.style.display = 'inline';
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
            await loadUserData();
        } catch (error) {
            console.error('Error al registrar usuario:', error);
            let errorMessage = 'Error al registrar usuario.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Este correo electrónico ya está registrado. Por favor, inicia sesión o utiliza otro correo.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'El formato del correo electrónico no es válido.';
                    break;
                default:
                    errorMessage = 'Error al registrar usuario. Por favor, intenta nuevamente.';
            }
            
            alert(errorMessage);
        }
    });


    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            console.log('Usuario autenticado:', user.email);
            loginButton.style.display = 'none';
            emailLoginButton.style.display = 'none';
            userEmail.textContent = user.email;
            userEmail.style.display = 'inline';
            document.body.classList.add('authenticated');
            loadUserData();
        } else {
            console.log('Usuario no autenticado');
            loginButton.style.display = 'inline';
            emailLoginButton.style.display = 'inline';
            userEmail.style.display = 'none';
            document.body.classList.remove('authenticated');
            resetData();
        }
    });
}

function initializeCounters() {
    const startDate = new Date('2024-01-01'); // Cambiar a la fecha real de inicio de la relación
    const daysCounter = document.getElementById('daysCounter');
    const nextMeetCounter = document.getElementById('nextMeetCounter');

    function updateCounters() {
        const today = new Date();
        const daysTogether = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        daysCounter.textContent = daysTogether;

        const nextMeetDate = localStorage.getItem('nextMeetDate');
        if (nextMeetDate) {
            const daysUntilMeet = Math.ceil((new Date(nextMeetDate) - today) / (1000 * 60 * 60 * 24));
            nextMeetCounter.textContent = daysUntilMeet > 0 ? daysUntilMeet : '¡Hoy nos vemos!';
        }
    }

    updateCounters();
    setInterval(updateCounters, 1000 * 60 * 60); // Actualizar cada hora
}

function initializeCalendar() {
    const calendar = document.getElementById('calendar');
    let currentDisplayDate = new Date();

    window.prevMonth = function() {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
        renderCalendar();
    };

    window.nextMonth = function() {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
        renderCalendar();
    };

    function renderCalendar() {
        const month = currentDisplayDate.getMonth();
        const year = currentDisplayDate.getFullYear();
        const today = new Date();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        let calendarHTML = `
            <div class="calendar-header">
                <button class="btn btn-sm btn-outline-primary" onclick="prevMonth()">&lt;</button>
                <h3>${new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentDisplayDate)}</h3>
                <button class="btn btn-sm btn-outline-primary" onclick="nextMonth()">&gt;</button>
            </div>
            <div class="calendar-grid">
                <div class="weekday">Dom</div>
                <div class="weekday">Lun</div>
                <div class="weekday">Mar</div>
                <div class="weekday">Mié</div>
                <div class="weekday">Jue</div>
                <div class="weekday">Vie</div>
                <div class="weekday">Sáb</div>
        `;

        for (let i = 0; i < firstDay.getDay(); i++) {
            calendarHTML += '<div class="day empty"></div>';
        }

        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasEvent = events.some(event => event.date === date);
            const isToday = isSameDay(new Date(date), today);
            const nextMeetDate = localStorage.getItem('nextMeetDate');
            const isMeetingDay = nextMeetDate && isSameDay(new Date(date), new Date(nextMeetDate));

            calendarHTML += `
                <div class="day ${hasEvent ? 'has-event' : ''} ${isToday ? 'today' : ''} ${isMeetingDay ? 'meeting-day' : ''}" data-date="${date}">
                    ${day}
                    ${hasEvent ? '<span class="event-indicator">📝</span>' : ''}
                    ${isMeetingDay ? '<span class="meeting-indicator">❤️</span>' : ''}
                </div>
            `;
        }

        calendarHTML += '</div>';
        calendar.innerHTML = calendarHTML;

        document.querySelectorAll('.day').forEach(day => {
            if (!day.classList.contains('empty')) {
                day.addEventListener('click', () => {
                    const date = day.dataset.date;
                    const dayEvents = events.filter(event => event.date === date);
                    showEvents(date, dayEvents);
                });
            }
        });
    }

    renderCalendar();
}

function initializeGoals() {
    const pendingGoalsList = document.getElementById('pendingGoalsList');
    const completedGoalsList = document.getElementById('completedGoalsList');

    window.saveGoal = async function() {
        if (!currentUser) return;

        const description = document.getElementById('goalDescription').value;
        const date = document.getElementById('goalDate').value;

        if (!description || !date) return;

        const newGoal = {
            id: Date.now(),
            description,
            date,
            completed: false
        };

        goals.push(newGoal);
        await updateGoals();
        document.getElementById('goalForm').reset();
        bootstrap.Modal.getInstance(document.getElementById('addGoalModal')).hide();
    };

    window.toggleGoal = async function(goalId) {
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
            goal.completed = !goal.completed;
            await updateGoals();
        }
    };

    function renderGoals() {
        const pending = goals.filter(g => !g.completed);
        const completed = goals.filter(g => g.completed);

        pendingGoalsList.innerHTML = pending.map(goal => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                ${goal.description}
                <button class="btn btn-sm btn-success" onclick="toggleGoal(${goal.id})">✓</button>
            </li>
        `).join('');

        completedGoalsList.innerHTML = completed.map(goal => `
            <li class="list-group-item d-flex justify-content-between align-items-center text-muted">
                <del>${goal.description}</del>
                <button class="btn btn-sm btn-warning" onclick="toggleGoal(${goal.id})">↩</button>
            </li>
        `).join('');
    }

    async function updateGoals() {
        if (!currentUser) return;
        await set(ref(database, `users/${currentUser.uid}/goals`), goals);
        renderGoals();
    }
}

function initializeSongs() {
    const playlistGrid = document.getElementById('playlistGrid');

    window.saveSong = async function() {
        if (!currentUser) return;

        const title = document.getElementById('songTitle').value;
        const artist = document.getElementById('songArtist').value;
        const link = document.getElementById('songLink').value;
        const description = document.getElementById('songDescription').value;

        if (!title || !artist || !link || !description) return;

        const newSong = {
            id: Date.now(),
            title,
            artist,
            link,
            description,
            addedBy: currentUser.email
        };

        songs.push(newSong);
        await updateSongs();
        document.getElementById('songForm').reset();
        bootstrap.Modal.getInstance(document.getElementById('addSongModal')).hide();
    };

    function renderSongs() {
        playlistGrid.innerHTML = songs.map(song => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${song.title}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${song.artist}</h6>
                        <p class="card-text">${song.description}</p>
                        <a href="${song.link}" class="btn btn-primary" target="_blank">Escuchar</a>
                    </div>
                    <div class="card-footer text-muted">
                        Agregada por: ${song.addedBy}
                    </div>
                </div>
            </div>
        `).join('');
    }

    async function updateSongs() {
        if (!currentUser) return;
        await set(ref(database, `users/${currentUser.uid}/songs`), songs);
        renderSongs();
    }
}

async function loadUserData() {
    if (!currentUser) {
        console.error('No hay usuario autenticado');
        return;
    }

    try {
        console.log('Iniciando carga de datos para usuario:', currentUser.email);
        // Verificar y actualizar estado de autenticación
        const userRef = ref(database, `users/${currentUser.uid}/profile`);
        await set(userRef, {
            email: currentUser.email,
            lastLogin: new Date().toISOString()
        });

        // Cargar eventos del calendario
        const eventsRef = ref(database, `users/${currentUser.uid}/events`);
        onValue(eventsRef, (snapshot) => {
            events = snapshot.val() || [];
            if (typeof renderCalendar === 'function') {
                renderCalendar();
            }
        }, (error) => {
            console.error('Error al cargar eventos:', error);
            alert('Error al cargar los eventos. Por favor, recarga la página.');
        });

    // Cargar metas
    const goalsRef = ref(database, `users/${currentUser.uid}/goals`);
    onValue(goalsRef, (snapshot) => {
        goals = snapshot.val() || [];
        renderGoals();
    }, (error) => {
        console.error('Error al cargar metas:', error);
    });

    // Cargar canciones
    const songsRef = ref(database, `users/${currentUser.uid}/songs`);
    onValue(songsRef, (snapshot) => {
        songs = snapshot.val() || [];
        renderSongs();
    }, (error) => {
        console.error('Error al cargar canciones:', error);
    });

    // Cargar próxima reunión
    const meetingRef = ref(database, `users/${currentUser.uid}/nextMeeting`);
    onValue(meetingRef, (snapshot) => {
        const meetingData = snapshot.val();
        if (meetingData?.date) {
            localStorage.setItem('nextMeetDate', meetingData.date);
            initializeCounters();
        }
    }, (error) => {
        console.error('Error al cargar próxima reunión:', error);
    });
}

function resetData() {
    events = [];
    goals = [];
    songs = [];
    if (typeof renderCalendar === 'function') {
        renderCalendar();
    }
}

function showLoadingState(show) {
    const loginButton = document.getElementById('loginButton');
    const emailLoginButton = document.getElementById('emailLoginButton');
    if (show) {
        loginButton.disabled = true;
        emailLoginButton.disabled = true;
        loginButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cargando...';
        emailLoginButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cargando...';
    } else {
        loginButton.disabled = false;
        emailLoginButton.disabled = false;
        loginButton.innerHTML = 'Iniciar Sesión con Google';
        emailLoginButton.innerHTML = 'Iniciar Sesión con Correo';
    }
}

function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

window.saveMeeting = async function() {
    if (!currentUser) return;

    const date = document.getElementById('meetingDate').value;
    const place = document.getElementById('meetingPlace').value;

    if (!date || !place) return;

    const meetingRef = ref(database, `users/${currentUser.uid}/nextMeeting`);
    await set(meetingRef, { date, place });
    localStorage.setItem('nextMeetDate', date);
    bootstrap.Modal.getInstance(document.getElementById('meetingModal')).hide();
    initializeCounters();
};

window.saveEvent = async function() {
    if (!currentUser) return;

    const description = document.getElementById('eventDescription').value;
    const selectedDate = document.querySelector('.day.selected')?.dataset.date;

    if (!description || !selectedDate) return;

    const newEvent = {
        id: Date.now(),
        description,
        date: selectedDate
    };

    const eventsRef = ref(database, `users/${currentUser.uid}/events`);
    const currentEvents = [...events, newEvent];
    await set(eventsRef, currentEvents);
    document.getElementById('eventDescription').value = '';
    renderCalendar();
};

function showEvents(date, dayEvents) {
    const formattedDate = new Date(date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const eventDisplay = document.getElementById('eventDisplay');
    const eventContent = document.getElementById('eventContent');
    let eventsHTML = `<h4>${formattedDate}</h4>`;

    if (dayEvents.length > 0) {
        eventsHTML += '<ul class="event-list">';
        dayEvents.forEach(event => {
            eventsHTML += `<li>${event.description}</li>`;
        });
        eventsHTML += '</ul>';
    } else {
        eventsHTML += '<p>No hay notas para este día</p>';
    }

    eventContent.innerHTML = eventsHTML;
    eventDisplay.style.display = 'block';
    eventDisplay.dataset.date = date;
}