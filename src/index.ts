import express, {Request, Response}  from "express";

const app:any = express();

interface User {
    customer_id: number, 
    first_name: string, 
    last_name: string, 
    email: string, 
    balance: number
}

enum Side {
    Buy, 
    Sell
}

interface Order {
    type: Side, 
    price: number,
    qty: number
}

const OrderBook: {[key: string] : Order} = 
{
    "tata" : {
        type: Side.Buy,
        price: 1000,
        qty: 10
    }, 
};

// in-memory user data
const users:User[] = [
    {
        customer_id: 169876,
        first_name: "Shubham",
        last_name: "Sonthalia",
        email: "shubham@gmail.com",
        balance: 14942.43
    }, 
    {
        customer_id: 169877,
        first_name: "Sam",
        last_name: "Singh",
        email: "samgmail.com",
        balance: 10000000.00
    }, 
    {
        customer_id: 169878,
        first_name: "Sukh",
        last_name: "Dev",
        email: "sukhgmail.com",
        balance: 98765.43
    }
];

app.get("/balance", (req:Request, res:Response) => {
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


const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});