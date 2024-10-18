import express, {Request, Response}  from "express";

export const orderRoute:any = express.Router();
orderRoute.use(express.json());

enum Side {
    Buy, 
    Sell
}

interface Order {
    type: Side, 
    price: number,
    qty: number
}

let order_books:{[key: string] : Order[]} = {
    "tata" : 
    [
        {
            type: Side.Sell,
            price: 1000,
            qty: 7
        }, 
        {
            type: Side.Sell,
            price: 999,
            qty: 12
        }, 
        {
            type: Side.Sell,
            price: 998,
            qty: 21
        }, 
        {
            type: Side.Sell,
            price: 997,
            qty: 100
        }, 
            {
            type: Side.Buy,
            price: 995,
            qty: 7
        }, 
        {
            type: Side.Buy,
            price: 994,
            qty: 12
        }, 
        {
            type: Side.Buy,
            price: 993,
            qty: 21
        }, 
        {
            type: Side.Buy,
            price: 992,
            qty: 100
        }
    ],  
};


// zod validation
// middleware authentication

orderRoute.post("/", (req:Request, res:Response) => {
    const body = req.body;
    // if no limit present in property
    if (!body.limit){
        //market order
        var qty = body.qty;
        var ticker = body.ticker;
        if (ticker in order_books)
        {
            const order_book = order_books.ticker;
            if(body.type == "sell"){
                // filtering open "buy" orders
                const bids:Order[] = order_book.filter((order) => {order.type == Side.Buy});
                
                // if buy orders present
                if(bids.length > 0){
                    // will have to average out the price
                    // based on the qty and the buy bid 
                    //size
                }

            }
        }
        
    }

    return res.status(200).send();


});