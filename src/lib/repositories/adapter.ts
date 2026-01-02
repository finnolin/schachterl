import { testlocal } from './local/test';
import { getTest } from './remote/test.remote';

const offline = false;

export class RestRepo {
	test: typeof testlocal | typeof getTest = offline ? testlocal : getTest;
}

export const db = new RestRepo();
