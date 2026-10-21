/** 房間連接配置；未指定來源／返回區域的舊建築沿用校園null。 */
export const entranceRoom=def=>def.entrance?.room??null;
export const exitDestination=def=>({room:def?.returnRoom??null,spawn:def?.returnTo});
