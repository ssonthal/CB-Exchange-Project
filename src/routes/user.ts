import express, {Request, Response}  from "express";

export const userRoute:any = express.Router();
userRoute.use(express.json());

export interface OwnedAssets {
    avg_price: number, 
    qty: number
}

export interface User {
    customer_id: number,  
    email: string, 
    balance: number,
    assets: Map<string, OwnedAssets>
}
export var users:Map<string, User>;

function createUser() {
    const user1: User = {
        customer_id: 169876,
        email: "shubham@gmail.com",
        balance: 14942.43,
        assets: new Map()
    }; 
    const user2: User = {
        customer_id: 169877,
        email: "samgmail.com",
        balance: 10000000.00,
        assets: new Map()
    };
    const user3: User = {
        customer_id: 169878,
        email: "sukhgmail.com",
        balance: 98765.43,
        assets: new Map()
    }

    users.set(user1.customer_id.toString(), user1);
    users.set(user2.customer_id.toString(), user2);
    users.set(user3.customer_id.toString(), user3);
}
createUser();
userRoute.get("/balance", (req:Request, res:Response) => {
    const user = req.userDetail;
    if (user){
        return res.status(200).json({balance: user.balance});
    }
    return res.status(400).json({msg: "Bad Request"});
});
