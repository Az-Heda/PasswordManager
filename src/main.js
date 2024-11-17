const { invoke } = window.__TAURI__.core;

async function GetServiceList() {
  const services = await invoke('get_service_list');
  const serviceList = services.replaceAll('\r', '').split('\n').filter(i => i.length > 0).map(i => i.split('}->'));
  console.log(serviceList);
  return serviceList;
}

async function AddService(key, service) {
  return invoke('add_service', { key, service });
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
    for (const [key, service] of await GetServiceList()) {
      const label = document.createElement('span');
      const pws = document.createElement('span');
      const btn = document.createElement('button');

      label.innerHTML = key;
      btn.innerHTML = 'Copy';
      pws.classList.add('truncate', 'max-w-32');
      btn.classList.add('bg-zinc-300', 'hover:bg-green-500', 'dark:bg-zinc-700', 'dark:hover:bg-green-700', 'border', 'border-zinc-700', 'dark:border-zinc-300', 'transition-colors', 'duration-300');

      passwords[key+' - '+service] = pws;

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

    const askStringWIthMinLength = (msg, ml) => {
      let res = '§';
      while (res.length < ml || res == '') {
        res = prompt(msg+`\nMin length: ${ml}`);
      }
      return res;
    }

    const serviceKey = askStringWIthMinLength("Insert service key:\n(This will be visible on this page)", 3);
    if (serviceKey.length == 0) return;

    const serviceContent = askStringWIthMinLength("Insert service secret value:\n(This will not be visible and it's stored in the service file)", 8);
    if (serviceContent.length == 0) return;

    console.log({ serviceKey, serviceContent });
    
    // const newService = prompt(`Insert service secret content: \n(min length: ${minLength})`);
    // if (newService.length < minLength) {
    //   alert(`ERROR\nLength: ${newService.length}\nMin length: ${minLength}`)
    //   return;
    // }
    await AddService(serviceKey, serviceContent);
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