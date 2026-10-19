import { Injectable } from '@angular/core';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { environment } from '../../../environments/environment';

const app: FirebaseApp = initializeApp(environment.firebase);

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  readonly db: Firestore = getFirestore(app);
}