import express, {Request, Response}  from "express";

export const userRoute:any = express.Router();
userRoute.use(express.json());

export interface OwnedAssets {
    avg_price: number, 
    qty: number, 
    ticker: string
}

export interface User {
    customer_id: number,  
    email: string, 
    balance: number,
    assets: OwnedAssets[]
}

// in-memory user data
export const users:User[] = [
    {
        customer_id: 169876,
        email: "shubham@gmail.com",
        balance: 14942.43,
        assets: []
    }, 
    {
        customer_id: 169877,
        email: "samgmail.com",
        balance: 10000000.00,
        assets: []
    }, 
    {
        customer_id: 169878,
        email: "sukhgmail.com",
        balance: 98765.43,
        assets: []
    }
];



userRoute.get("/balance", (req:Request, res:Response) => {
    let queries = req.query;
    console.log(queries);
    let userId = queries["userId"]
    const user = users.find(user => user.customer_id.toString() === userId);
    console.log(user);
    console.log(userId);
    if (user){
        return res.status(200).json({balance: user.balance});
    }
    return res.status(400).json({msg: "Bad Request"});
});
