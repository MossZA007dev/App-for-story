'use client';
import {useCallback,useState} from 'react';
import {Users} from 'lucide-react';
import {CollaboratorModal} from './CollaboratorModal';
export function ProjectAccess({projectId,projectTitle="ผู้ร่วมเขียนเรื่องนี้",universe}:{projectId:string;projectTitle?:string;universe?:string}){const [open,setOpen]=useState(false);const close=useCallback(()=>setOpen(false),[]);return <><button type="button" className="ma-outline" onClick={()=>setOpen(true)}><Users size={16}/>จัดการผู้ร่วมแต่ง</button><CollaboratorModal isOpen={open} onClose={close} projectId={projectId} projectTitle={projectTitle} universe={universe}/></>;}
