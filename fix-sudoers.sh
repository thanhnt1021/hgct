#!/usr/bin/bash
cat > /etc/sudoers.d/hgct-deploy << 'EOF'
Defaults:hgct !use_pty
hgct ALL=(ALL) NOPASSWD: /usr/bin/bash /home/hgct/hgct/deploy.sh
hgct ALL=(ALL) NOPASSWD: /usr/bin/bash /home/hgct/hgct/deploy-demo.sh *
hgct ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart hgct.service
hgct ALL=(ALL) NOPASSWD: /usr/bin/systemctl start hgct.service
hgct ALL=(ALL) NOPASSWD: /usr/bin/systemctl stop hgct.service
hgct ALL=(ALL) NOPASSWD: /usr/bin/systemctl status hgct.service
hgct ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart hgct-demo.service
hgct ALL=(ALL) NOPASSWD: /usr/bin/systemctl status hgct-demo.service
EOF
chmod 440 /etc/sudoers.d/hgct-deploy
visudo -c && echo "=== Sudoers OK ==="
