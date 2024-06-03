import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function Page() {
  return (
      <div className="w-full">
        <div className="flex items-center justify-center py-12">
          <div className="mx-auto grid w-[350px] gap-6">
            <div className="grid gap-2 text-center">
              <h1 className="text-3xl font-bold">Download</h1>
              <p className="text-balance text-muted-foreground">
                Insira o link do vídeo para download
              </p>
            </div>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="link">Link</Label>
                <Input
                    id="link"
                    type="url"
                    placeholder="https..."
                    required
                />
              </div>
              <Button type="submit" className="w-full">
                Analisar vídeo
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Está dando algum problema?{" "}
              <Link href="#" className="underline">
                Tente novamente
              </Link>
            </div>
          </div>
        </div>
      </div>
  )
}
