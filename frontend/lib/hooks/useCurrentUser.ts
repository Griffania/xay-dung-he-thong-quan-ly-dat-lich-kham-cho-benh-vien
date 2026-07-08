'use client';
import {useEffect,useState} from 'react'

export function useCurrentUser(){
    const [currentUser,setCurrentUser] = useState<any>(null);
    useEffect(()=>{
        if(typeof window!=='undefined'){
            const userStr = localStorage.getItem('user');
            if(userStr){
                setCurrentUser(JSON.parse(userStr));
            }
        }
    },[]);
    return currentUser;
}