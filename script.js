const $messages = document.getElementById('messages');
const $form = document.getElementById('chat-form');
const $input = document.getElementById('user-input');

// Keep light-weight local history (user/assistant only). Server will add the system prompt.
let history = JSON.parse(sessionStorage.getItem('history') || '[]');

function addMessage(role, text){
  const div = document.createElement('div');
  div.className = `msg msg--${role}`;
  div.innerHTML = `
    <div class="msg__avatar" aria-hidden="true"></div>
    <div class="bubble"></div>
  `;
  div.querySelector('.bubble').textContent = text;
  $messages.appendChild(div);
  $messages.scrollTop = $messages.scrollHeight;
}

function saveHistory(){
  sessionStorage.setItem('history', JSON.stringify(history.slice(-16))); // keep last 16 turns
}

async function sendToServer(history){
  const endpoint = '/.netlify/functions/chat';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ history })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Server error (${res.status}): ${txt}`);
  }
  return res.json();
}

$form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const text = $input.value.trim();
  if (!text) return;

  addMessage('user', text);
  history.push({ role: 'user', content: text });
  saveHistory();
  $input.value = '';
  $input.disabled = true; 
  $form.querySelector('button').disabled = true;

  try {
    const data = await sendToServer(history);
    const reply = data.reply || 'Sorry, I could not generate a response.';
    addMessage('bot', reply);
    history.push({ role: 'assistant', content: reply });
    saveHistory();
  } catch (err) {
    console.error(err);
    addMessage('bot', 'There was an error contacting the advisor. Please try again.');
  } finally {
    $input.disabled = false;
    $form.querySelector('button').disabled = false;
    $input.focus();
  }
});

// Greeting
if (history.length === 0) {
  addMessage('bot', 'Hello! I’m Dr. Ferdowsi. How can I help with EECE advising today?');
} else {
  // Restore last conversation
  for (const m of history) addMessage(m.role === 'user' ? 'user' : 'bot', m.content);
}
