import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import {users, User} from "../routes/user";

export const authMiddleware = (req:Request, res:Response, next:NextFunction) => {
    const authorization = req.headers.authorization;
    if((!authorization) || !authorization.startsWith("Bearer "))
    {
        return res.status(401).json({});
    }
    let jwtToken = authorization.split(" ")[1];
    try
    {
        var decoded:any = jwt.verify(jwtToken, "secret_key");
        const user = users.find((user) => user.customer_id.toString() == decoded.userId);
        if (!user){
            return res.status(401).json({});
        }
        req.userDetail = user;
        next();
    }
    catch(error){
        return res.status(401).json({});
    }
}