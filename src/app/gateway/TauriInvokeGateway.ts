import InvokeGateway from "@/app/gateway/InvokeGateway";
import { invoke, InvokeArgs} from '@tauri-apps/api/tauri';

export default class TauriInvokeGateway implements InvokeGateway {

    invoke<T>(cmd: string, args?: InvokeArgs): Promise<T> {
        return invoke<T>(cmd, args);
    }

}
