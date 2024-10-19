import express, {Request, Response}  from "express";
import {User, users, OwnedAssets} from "./user";

export const orderRoute:any = express.Router();
orderRoute.use(express.json());

enum Side {
    Buy, 
    Sell
}

interface Stakeholder {
    customer_id : number, 
    qty: number, 
    createdAt: Date
}

interface Order {
    type: Side, 
    price: number,
    qty: number,
    stakeholders: Stakeholder[]
}


let order_books:{[key: string] : Order[]} = {
    "tata" : 
    [
        {
            type: Side.Sell,
            price: 1000,
            qty: 7,
            stakeholders: []
        }, 
        {
            type: Side.Sell,
            price: 999,
            qty: 12, 
            stakeholders: []
        }, 
        {
            type: Side.Sell,
            price: 998,
            qty: 21, 
            stakeholders: []
        }, 
        {
            type: Side.Sell,
            price: 997,
            qty: 100, 
            stakeholders: []
        }, 
            {
            type: Side.Buy,
            price: 995,
            qty: 7, 
            stakeholders: []
        }, 
        {
            type: Side.Buy,
            price: 994,
            qty: 12,
            stakeholders: [] 
        }, 
        {
            type: Side.Buy,
            price: 993,
            qty: 21,
            stakeholders: []
        }, 
        {
            type: Side.Buy,
            price: 992,
            qty: 100,
            stakeholders: []
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
        const user = req.userDetail;
        if (ticker in order_books)
        {
            const order_book = order_books.ticker;
            if(body.type == "sell"){
                const bids:Order[] = order_book.filter((order) => {order.type == Side.Buy});
                if(bids.length > 0){
                    //sort the bids based on price
                    bids.sort((o1, o2) => o1.price - o2.price);
                    bids.map((bid) => {
                        if(bid.qty > qty){
                            if(user.balance >= qty*bid.price)
                            {
                                user.balance -= bid.price*qty;
                                bid.qty -= qty;
                                user.assets.add({ticker: ticker, qty : qty, avg_price: bid.price});

                                // First come First serve
                                bid.stakeholders.sort((s1, s2) => {return s1.createdAt.getTime() - s2.createdAt.getTime();});

                                // checking for qty
                                
                                
                            }
                            bid.qty -= qty;
                            user.balance
                        }
                    });
                }

            }
        }
        
    }

    return res.status(200).send();


});