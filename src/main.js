const { invoke } = window.__TAURI__.core;

async function GetServiceList() {
  const services = await invoke('get_service_list');
  const serviceList = services.replaceAll('\r', '').split('\n').filter(i => i.length > 0);
  console.log(serviceList);
  return serviceList;
}

async function AddService(service) {
  return invoke('add_service', { service });
}

async function GetPassword(password, service, maxLength) {
  const hash = await invoke('passwordify', { password, service, maxLength })
    .catch(err => alert(err));
  console.log({ password, service, hash });
  return hash;
}


window.addEventListener("DOMContentLoaded", async () => {
  const servicesGrid = document.querySelector('#services');
  const passwordInput = document.querySelector('#password');
  const addService = document.querySelector('#new-service');
  console.log(passwordInput)
  const passwords = {};

  const FetchPasswords = async () => {
    for (const [service, tag] of Object.entries(passwords)) {
      tag.innerHTML = (prev == '') ? '' : await GetPassword(prev, service, 16);
    }
  }
  const ShowAllServices = async () => {
    Object.keys(passwords).map(e => delete passwords[e]);
    servicesGrid.innerHTML = '';
    for (const service of await GetServiceList()) {
      const label = document.createElement('span');
      const pws = document.createElement('span');
      const btn = document.createElement('button');

      label.innerHTML = service;
      btn.innerHTML = 'Copy';
      pws.classList.add('truncate', 'max-w-32');
      btn.classList.add('bg-zinc-400', 'hover:bg-green-500', 'dark:bg-zinc-700', 'dark:hover:bg-green-700', 'border', 'border-zinc-700', 'dark:border-zinc-300', 'transition-colors', 'duration-300');

      passwords[service] = pws;

      servicesGrid.appendChild(label);
      servicesGrid.appendChild(pws);
      servicesGrid.appendChild(btn);

      btn.onclick = () => {
        navigator.clipboard.writeText(pws.innerText);
      };
    }
  }

  addService.onclick = async () => {
    const minLength = 4;
    const newService = prompt(`Insert service name: \n(min length: ${minLength})`);
    if (newService.length < minLength) {
      alert(`ERROR\nLength: ${newService.length}\nMin length: ${minLength}`)
      return;
    }
    await AddService(newService)
    await ShowAllServices();
    await FetchPasswords();
  }

  let prev = '';
  passwordInput.onkeyup = async (evt) => {
    if (passwordInput.value == '') {
      prev = '';
      Object.values(passwords).map(t => t.innerHTML = '');
      return;
    }
    if (passwordInput.value == prev) return;
    prev = passwordInput.value;
    await FetchPasswords();
  };

  ShowAllServices();
});