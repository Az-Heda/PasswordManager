import './styles/globals.css';

import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { KeyRound, Plus } from "lucide-react";
import { toast } from "sonner"

import { Input } from "./components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './components/ui/hover-card';


type Service = {
  key: string;
  name: string;
  // added: Date;
  password?: string;
}

function App() {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [typedPassword, setTypedPassword] = useState<string>("");
  const [newServiceKey, setNewServiceKey] = useState<string>(getRandomServiceKey());
  const [newServiceName, setNewServiceName] = useState<string>("");

  function getRandomServiceKey(): string {
    return crypto.randomUUID().replace(/[^a-z0-9]/gi, '')
  }

  const newService: Service = useMemo(() => {
    return {
      key: newServiceKey ?? "",
      name: newServiceName ?? ""
    }
  }, [newServiceKey, newServiceName])

  const [maxLength, setMaxlength] = useState<number>(32);
  const [services, setServices] = useState<Service[]>([]);

  async function GetAllServices() {
    setServices(await invoke("get_service_list"));
  }

  function RequestPasswords() {
    if (typedPassword.length == 0) {
      setServices(services.map(i => {
        return {
          ...i,
          password: undefined
        }
      }));
      return;
    }
    for (const srv of services) {
      invoke('passwordify', {
        password: typedPassword,
        service: `${srv.key} - ${srv.name}`,
        maxLength: maxLength,
      }).then((data: unknown) => {
        setServices(services.map(i => {
          if (i.key != srv.key) return i;
          if (i.name != srv.name) return i;
          return {
            ...i,
            password: `${data}`,
          }
        }))
        srv.password = `${data}`;
      })
    }
  }

  useEffect(() => {
    RequestPasswords();
  }, [typedPassword, maxLength])

  function Sanitize(val: string): string {
    return val.replace(/[^a-z0-9 -_,]/gi, '');
  }

  useEffect(() => {
    GetAllServices();

    const form = document.querySelector<HTMLFormElement>('#new-service');
    if (form) {
      form.onsubmit = formCatcher;
    }
    console.log({ form })
  }, []);

  async function formCatcher(e: Event | undefined) {
    if (e) {
      e.preventDefault();
    }
    await invoke("add_service", { key: newService.key, service: newService.name }).catch(console.error)
    setModalOpen(false);
    GetAllServices().then(() => RequestPasswords());
    setTimeout(() => {
      setNewServiceKey(getRandomServiceKey());
      setNewServiceName("");
    }, 100)
  }

  async function CopyText(service: Service) {
    const content = service.password;
    if (!content) {
      toast.error(
        <div>
          <h1 className="font-bold truncate">Error</h1>
          <p>Password not found</p>
        </div>
      )
      return;
    }
    navigator.clipboard.writeText(content)
      .then(_ => {
        toast.success((
          <div>
            <h1 className="font-bold truncate">{service.name}</h1>
            <p>Password copied successfully</p>
          </div>
        ))
      })
      .catch(_ => {
        toast.error(
          <div>
            <h1 className="font-bold truncate">{service.name}</h1>
            <p>Unable to copy password...</p>
          </div>
        )
      });
  }

  return (
    <main >
      <div className="flex flex-nowrap items-center justify-center gap-5 m-5">
        <KeyRound className="stroke-primary" />
        <Label className="flex flex-col items-start">
          Password
          <Input
            className="w-100"
            placeholder="Type your password"
            type="password"
            autoComplete="off"
            value={typedPassword}
            onChange={(e) => setTypedPassword(e.target.value)}
            onKeyUp={(e) => setTypedPassword((e.target as HTMLInputElement).value)}
          />
        </Label>
        <Label className="flex flex-col items-start">
          Password Length
          <Select onValueChange={(e) => setMaxlength(+e)} defaultValue={maxLength.toString()}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Max length"></SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[10, 12, 15, 16, 20, 25, 30, 32, 40].map(ml => (
                <SelectItem
                  value={ml.toString()}
                  key={`max-length-${ml}`}
                >
                  {ml}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Label>
        <KeyRound className="stroke-primary rotate-y-180" />
      </div>
      <div className="flex flex-wrap justify-center items-center gap-5 m-5">
        <Button
          variant="outline"
          onClick={() => setModalOpen(true)}
        >
          <Plus />
          Add a new service
        </Button>
      </div>
      <div className="flex flex-wrap justify-center items-center gap-5 m-5">
        {services && services.map(i => (
          i.password
            ? (
              <HoverCard>
                <HoverCardTrigger>
                  <Card
                    key={`servce-${i.key}+${i.name}`}
                    className="w-80 hover:shadow hover:shadow-primary transition-all duration-200 select-none hover:cursor-pointer"
                    onClick={() => CopyText(i)}
                  >
                    <CardHeader>
                      <CardTitle className="truncate">
                        {i.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="truncate text-xs italic">
                        {
                          i.password
                            ? i.password
                            : '-'.repeat(30)
                        }
                      </p>
                    </CardContent>
                  </Card>
                </HoverCardTrigger>
                <HoverCardContent>
                  Click to copy the password
                </HoverCardContent>
              </HoverCard>
            )
            : <Card
              key={`servce-${i.key}+${i.name}`}
              className="w-80 hover:shadow hover:shadow-primary transition-all duration-200 select-none"
            >
              <CardHeader>
                <CardTitle className="truncate">
                  {i.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="truncate text-xs italic">{i.password ? i.password : '-'.repeat(30)}</p>
              </CardContent>
            </Card>
        ))}
      </div>
      <Toaster
        duration={4000}
        position="bottom-right"
        visibleToasts={10}
        swipeDirections={["right", "bottom"]}
        richColors
        className="select-none"
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <form id="new-service">
          {/* <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger> */}
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add new service</DialogTitle>
              <DialogDescription>Create a new service using a custom key and name</DialogDescription>
            </DialogHeader>
            <div className="grid gap-5">
              <div className="grid gap 3">
                <Label htmlFor="new-service-key">Key</Label>
                <Input
                  id="new-service-key"
                  placeholder="Secret Key"
                  value={newServiceKey}
                  onChange={(e) => setNewServiceKey(e.target.value)}
                />
              </div>
              <div className="grid gap 3">
                <Label htmlFor="new-service-name">Name</Label>
                <Input
                  id="new-service-name"
                  placeholder="Service label"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key.toUpperCase() == 'ENTER') {
                      formCatcher(undefined)
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                {<Button type="submit" onClick={() => formCatcher(undefined)}>
                  Save changes
                </Button>}
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </form>
      </Dialog>
    </main>
  );
}

export default App;
