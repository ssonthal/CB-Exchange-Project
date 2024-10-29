# Architecture 


<img src="https://github.com/user-attachments/assets/b8145807-88f2-4259-a961-012e8cadaace" alt="drawing" style="width:500px;height:800px"/>




# Market Buy Order Workflow

![Market-Buy Orders](https://github.com/user-attachments/assets/cadb2253-c602-4c55-b36c-b979ca9c5584)


Need to learn about: 

1. QueueEngine for RedisClient to process orderbook, trade, user balance requests.
2. QueueEngine service will respond back to backend service and also broadcast event to kafka stream for updating DB with user and trade details.
3. QueueEngine service will also be responsible to push the orderbook and user balance snapshot to S3 engine periodically. 
