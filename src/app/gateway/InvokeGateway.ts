import {InvokeArgs} from "@tauri-apps/api/tauri";

export default interface InvokeGateway {
    invoke<T>(cmd: string, args?: InvokeArgs): Promise<T>;
}
