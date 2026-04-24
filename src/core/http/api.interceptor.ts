import { HttpInterceptorFn } from '@angular/common/http';

// TODO LLD-02: add Authorization header injection here
export const apiInterceptor: HttpInterceptorFn = (req, next) => next(req);
