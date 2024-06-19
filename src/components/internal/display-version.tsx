"use client"

import React, {useEffect, useState} from "react";
import {getVersion} from '@tauri-apps/api/app';

export default function DisplayVersion() {

    const [version, setVersion] = useState<string | null>(null);

    useEffect(() => {
        init();
    }, []);

    async function init() {
        const appVersion = await getVersion();
        setVersion(appVersion);
    }

    return (
        <span>{version}</span>
    )

}
