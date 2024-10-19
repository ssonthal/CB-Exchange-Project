import express from "express";
import {User} from "routes/user"

declare global {
    namespace Express {
        interface Request {
            userDetail: User;
        }
    }
}