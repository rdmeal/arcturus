create table BOT (
    id uuid primary key,
    url varchar(255) not null,
);

create enum  MOVE_TYPE (
    ROCK,
    PAPER, 
    SCISSORS
   );

create table MATCH (
    id uuid primary key,
    bot_alpha_id uuid not null,
    bot_bravo_id uuid not null,
    bot_alpha_move MOVE_TYPE null,
    bot_bravo_move MOVE_TYPE null,
    created_at timestamp not null,
    foreign key (bot_alpha_id) references BOT(id),
    foreign key (bot_bravo_id) references BOT(id)
);


