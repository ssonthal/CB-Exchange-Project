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
    stakeholders: Map<string, Stakeholder>
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

orderRoute.post("/", (req:Request, res:Response) => {
    // if no limit present in property
    
    if (req.body.ticker in order_books)
    {
        if (!req.body.limit) 
        {
            const order_book = order_books.ticker;
            // Case 1: Market Order & Buy
            if(req.body.type == Side.Buy)
            {
                return handleMarketBuyOrders(req, res, order_book);
            }
            else if (req.body.type == Side.Sell){
                return handleMarketSellOrders(req, order_book);
            }
        }
        else{
            const order_book = order_books.ticker;
            if(req.body.type == Side.Buy)
            {
                return handleLimitBuyOrders(req, order_book);
            }
            else if (req.body.type == Side.Sell){
                return handleLimitSellOrders(req, order_book);
            }
        }
    }
    else
    {
        return res.status(403).json({msg: "Couldn't find the requested stock ticker!!!"});
    }
});

function handleMarketBuyOrders(req:Request, res: Response, order_book:Order[])
   {
                const buyer:User = req.userDetail;
                const sellOrders:Order[] = order_book.filter((order) => {order.type == Side.Sell});
                const buyQty = req.body.qty;
                const ticker = req.body.ticker;
                if(sellOrders.length > 0){
                    //sort the bids based on price
                    var remaining_qty = buyQty;
                    
                    while (remaining_qty > 0){
                        sellOrders.sort((o1, o2) => o2.price - o1.price);
                        sellOrders.map((sellOrder) => {
                            if (sellOrder.qty > buyQty)
                            {
                                if (buyer.balance >= sellOrder.price*buyQty){
                                    let validStakeholders:Stakeholder[]  = getValidStakeholdersFromSellOrder([sellOrder], qty);
                                    updateSellOrdersInOrdersMap();
                                }
                                else{
                                    return res.status(403).json({msg: "Insufficient wallet balance"});
                                }
                                
                            }
                        });
                    }
                    
                    asks.map((ask) => {
                        if(ask.qty > qty && buyer.balance >= ask.price*qty) {
                            // First come First serve for stakeholders
                            
                            ask.stakeholders.sort((s1, s2) => {return s1.createdAt.getTime() - s2.createdAt.getTime();});
                            // checking for qty
                            const stakeholder: Stakeholder | undefined  = ask.stakeholders.find((stakeholder) => {return stakeholder.qty >= qty});
                            while (ask)
                            let seller_id:number;
                            if (stakeholder) {
                                seller_id = stakeholder.customer_id;
                                if(stakeholder.qty == qty) {
                                    //remove stakeholder
                                    ask.stakeholders.splice(ask.stakeholders.indexOf(stakeholder));
                                }
                                else {
                                    //partial order serving
                                    ask.stakeholders[ask.stakeholders.indexOf(stakeholder)].qty -= qty;
                                }

                                //handle buyer and seller data
                                updateUserBalanceAndAssets(buyer, ask.price, qty, ticker, Side.Buy);

                                const seller:any = users.get(seller_id.toString());
                                
                                updateUserBalanceAndAssets(seller, ask.price, qty, ticker, Side.Sell);
                                
                                // handle order book data
                                order_book[order_book.indexOf(ask)].qty -= qty;
                                order_books[ticker] = order_book;
                                return res.status(200).json({
                                    msg: "Txn Successful"
                                });

                            }
                            else{
                                //need to sell stocks of multiple stakeholders
                            }                              
                        }
                        ask
                    });
                }

            } 


function updateUserBalanceAndAssets(user:User, price:number, qty: number, ticker: string, side: Side)
{
    if(side == Side.Buy) {
        user.balance -= price*qty;
        if (ticker in user.assets)
        {
            const ownedAssets:any = user.assets.get(ticker);
            ownedAssets.qty += qty;
            user.assets.set(ticker, ownedAssets);
        }
        else
        {
            user.assets.set(ticker, {qty : qty, avg_price: price});
        }
    }
    else {
        user.balance += price*qty;
        const ownedAssets:any = user.assets.get(ticker);
        ownedAssets.qty -= qty;
        if(ownedAssets.qty > 0){
            user.assets.set(ticker, ownedAssets);
        }
        else 
        {
            user.assets.delete(ticker);
        } 
    }
    users.set(user.customer_id.toString(), user);   
}

function getValidStakeholdersFromSellOrder(order: Order, qty: number) {
    
    let stakeholders:Stakeholder[] = [];
    
    order.stakeholders = sortStakeholdersBasedOnOrderCreatedTime(order);

    let excessQtyStakeholderId = ""; 
    for (const [customer_id, stakeholder] of order.stakeholders) {
        if (qty - stakeholder.qty >= 0) {
            qty -= stakeholder.qty;
            stakeholders.push(stakeholder);
        }
        else{
            // there is a chance that qty == 0 when the control reaches here.
            // in that case, we can simply break the loop.
            if(qty > 0){
                excessQtyStakeholderId = customer_id;
            }
            break;
        }
    }

    if(excessQtyStakeholderId) {
        //update stakeholder's qty. don't delete.
        let excessQtyStakeholder:any = order.stakeholders.get(excessQtyStakeholderId);
        excessQtyStakeholder.qty -= qty;
        stakeholders.push(excessQtyStakeholder);
        qty = 0;
        order.stakeholders.set(excessQtyStakeholderId, excessQtyStakeholder);
    }   
}

function sortStakeholdersBasedOnOrderCreatedTime(order:Order){
    const stakeholderMapArray = Array.from(order.stakeholders);
    const sorted = stakeholderMapArray.sort((a, b) => {
        return a[1].createdAt.getTime() - b[1].createdAt.getTime();
    });
    return new Map<string, Stakeholder>(sorted);
}
